"""UserIntelligenceService: lightweight real-time context for chat personalization.

Assembles a user's context snapshot from key data sources (profile, goals,
safety, patterns, weekly summary). Results are cached per user for 1 hour.

This is intentionally separate from TherapyDataCollector (intelligence app)
which is a heavier, comprehensive aggregator for background analysis.
"""

import logging
from datetime import timedelta

from django.core.cache import cache
from django.db.models import Q, Count
from django.utils import timezone

logger = logging.getLogger(__name__)

CACHE_KEY_PREFIX = 'user_intelligence'
CACHE_TIMEOUT = 3600  # 1 hour


def _get_attachment_label(anxiety: int, avoidance: int) -> str:
    """Map attachment dimensions to Korean label."""
    if anxiety >= 4 and avoidance >= 4:
        return '혼란형'
    if anxiety >= 4:
        return '불안형'
    if avoidance >= 4:
        return '회피형'
    return '안정형'


def _get_active_couple(user):
    """Return the active Couple for a user, or None."""
    from apps.couples.models import Couple
    return Couple.objects.filter(
        Q(user1=user) | Q(user2=user),
        status=Couple.Status.ACTIVE,
    ).first()


class UserIntelligenceService:
    """Builds a context dict for real-time chat personalization.

    Safety gate (CC1):
      - high risk: minimal context (attachment label only, mood without notes)
      - moderate risk: exclude trigger phrases and escalation details
      - low risk: all context
    """

    @classmethod
    def get_ai_context(cls, user_id: int) -> dict:
        """Return cached context dict for the given user.

        Max 6 ORM queries when cache is cold. Sync-only.
        """
        cache_key = f'{CACHE_KEY_PREFIX}:{user_id}'
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        context = cls._build_context(user_id)
        cache.set(cache_key, context, CACHE_TIMEOUT)
        return context

    @classmethod
    def invalidate_cache(cls, user_id: int) -> None:
        """Delete cached context for a user."""
        cache.delete(f'{CACHE_KEY_PREFIX}:{user_id}')

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @classmethod
    def _build_context(cls, user_id: int) -> dict:
        from apps.users.models import User

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            logger.warning('UserIntelligenceService: user %s not found', user_id)
            return cls._empty_context()

        # Query 1: SafetyAssessment
        risk_level, couple_features_enabled = cls._get_safety(user)

        # Query 2: UserProfile
        profile_ctx = cls._get_profile(user, risk_level)

        # Query 3: UserGoals
        goals_ctx = cls._get_goals(user, risk_level)

        # Solo user handling (CC3)
        couple = _get_active_couple(user)
        if couple is None:
            couple_features_enabled = False

        # Query 4 & 5: Patterns + WeeklySummary (skipped for high risk)
        pattern_ctx = cls._get_patterns(user, risk_level)

        context = {
            **profile_ctx,
            **goals_ctx,
            'risk_level': risk_level,
            'couple_features_enabled': couple_features_enabled,
        }
        if pattern_ctx:
            context['recent_patterns'] = pattern_ctx

        return context

    @classmethod
    def _get_safety(cls, user) -> tuple:
        """Return (risk_level, couple_features_enabled)."""
        from apps.safety.models import SafetyAssessment
        try:
            sa = SafetyAssessment.objects.get(user=user)
            return sa.risk_level, sa.couple_features_enabled
        except SafetyAssessment.DoesNotExist:
            return 'low', True

    @classmethod
    def _get_profile(cls, user, risk_level: str) -> dict:
        """Return attachment/conflict/communication context."""
        from apps.onboarding.models import UserProfile
        try:
            profile = UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            return {
                'attachment_style': None,
                'conflict_style': None,
                'communication_frequency': None,
            }

        anxiety = profile.attachment_anxiety
        avoidance = profile.attachment_avoidance
        label = _get_attachment_label(anxiety, avoidance)

        if risk_level == 'high':
            # Minimal: label only
            return {
                'attachment_style': {'label': label},
                'conflict_style': None,
                'communication_frequency': None,
            }

        return {
            'attachment_style': {
                'anxiety': anxiety,
                'avoidance': avoidance,
                'label': label,
            },
            'conflict_style': profile.conflict_style,
            'communication_frequency': profile.communication_frequency,
        }

    @classmethod
    def _get_goals(cls, user, risk_level: str) -> dict:
        """Return primary goal and focus areas."""
        if risk_level == 'high':
            return {'primary_goal': None, 'focus_areas': []}

        from apps.onboarding.models import UserGoals
        try:
            goals = UserGoals.objects.get(user=user)
            return {
                'primary_goal': goals.primary_goal,
                'focus_areas': goals.focus_areas or [],
            }
        except UserGoals.DoesNotExist:
            return {'primary_goal': None, 'focus_areas': []}

    @classmethod
    def _get_patterns(cls, user, risk_level: str) -> dict | None:
        """Return recent pattern summary. None for high-risk users."""
        if risk_level == 'high':
            return None

        from apps.patterns.models import Pattern, WeeklySummary

        thirty_days_ago = timezone.now() - timedelta(days=30)

        # Query 4: Top pattern categories (last 30 days, top 5)
        top_categories = list(
            Pattern.objects.filter(
                user=user,
                created_at__gte=thirty_days_ago,
            )
            .values('category')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

        # For moderate risk, exclude trigger-specific data
        if risk_level == 'moderate':
            topics = [
                {'topic': item['category'], 'count': item['count']}
                for item in top_categories
                if item['category']
            ]
            return {
                'top_trigger_categories': [],
                'top_topics': topics,
                'escalation_trend': None,
                'avg_escalation_score': None,
            }

        # Low risk: full pattern data
        # Split categories by pattern type
        trigger_categories = list(
            Pattern.objects.filter(
                user=user,
                created_at__gte=thirty_days_ago,
                pattern_type='trigger_phrase',
            )
            .values('category')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

        topics = [
            {'topic': item['category'], 'count': item['count']}
            for item in top_categories
            if item['category']
        ]
        triggers = [
            item['category']
            for item in trigger_categories
            if item['category']
        ]

        # Query 5: Latest WeeklySummary (escalation_trend and trigger_frequency only)
        weekly = WeeklySummary.objects.filter(user=user).first()
        escalation_trend = weekly.escalation_trend if weekly else None
        trigger_frequency = weekly.trigger_frequency if weekly else {}

        # Compute average escalation score from recent InsightSummaries
        from apps.patterns.models import InsightSummary
        recent_insights = InsightSummary.objects.filter(
            user=user,
            created_at__gte=thirty_days_ago,
        ).values_list('escalation_score', flat=True)

        scores = list(recent_insights)
        avg_score = round(sum(scores) / len(scores), 1) if scores else None

        return {
            'top_trigger_categories': triggers,
            'top_topics': topics,
            'escalation_trend': escalation_trend,
            'avg_escalation_score': avg_score,
        }

    @staticmethod
    def _empty_context() -> dict:
        return {
            'attachment_style': None,
            'conflict_style': None,
            'communication_frequency': None,
            'primary_goal': None,
            'focus_areas': [],
            'risk_level': 'low',
            'couple_features_enabled': True,
        }
