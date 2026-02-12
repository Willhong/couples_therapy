"""Analysis trigger service for determining when to run intelligence analysis.

Evaluates multiple tiers of triggers in priority order:
1. CRITICAL - abuse/crisis signals requiring immediate analysis
2. THRESHOLD - significant changes in escalation, mood, or health score
3. SUFFICIENCY - enough data accumulated for meaningful analysis
4. PERIODIC - scheduled weekly analysis
"""

import logging
from dataclasses import dataclass
from datetime import timedelta
from enum import Enum

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class TriggerTier(str, Enum):
    CRITICAL = 'critical'
    THRESHOLD = 'threshold'
    SUFFICIENCY = 'sufficiency'
    PERIODIC = 'periodic'


@dataclass
class TriggerResult:
    should_trigger: bool
    tier: TriggerTier | None = None
    reason: str = ''


class AnalysisTriggerService:
    """Evaluates whether analysis should be triggered for a user."""

    def __init__(self):
        self.config = getattr(settings, 'ANALYSIS_TRIGGER_CONFIG', {
            'min_conversations': 3,
            'min_messages_per_conversation': 5,
            'min_checkin_days': 3,
            'escalation_threshold': 7,
            'mood_decline_days': 3,
            'weekly_analysis_day': 0,
            'cooldown_hours': 48,
        })

    def evaluate(self, user_id):
        """Check all trigger tiers in priority order."""
        if self._within_cooldown(user_id):
            return TriggerResult(should_trigger=False, reason='Within analysis cooldown period')

        # Check tiers in priority order
        for check_fn in [
            self._check_critical_signals,
            self._check_threshold_breach,
            self._check_data_sufficiency,
            self._check_periodic_schedule,
        ]:
            result = check_fn(user_id)
            if result.should_trigger:
                return result

        return TriggerResult(should_trigger=False, reason='No trigger conditions met')

    def _within_cooldown(self, user_id):
        """Check if user had a recent analysis within cooldown period."""
        from apps.intelligence.models import InsightReport

        cooldown_hours = self.config.get('cooldown_hours', 48)
        cutoff = timezone.now() - timedelta(hours=cooldown_hours)

        return InsightReport.objects.filter(
            user_id=user_id,
            created_at__gte=cutoff,
            status__in=['pending', 'processing', 'completed'],
        ).exists()

    def _check_critical_signals(self, user_id):
        """Check for abuse patterns or crisis indicators."""
        from apps.safety.models import CrisisEvent, SafetyAssessment

        # Check for recent crisis events
        recent_cutoff = timezone.now() - timedelta(hours=24)
        recent_crisis = CrisisEvent.objects.filter(
            user_id=user_id,
            created_at__gte=recent_cutoff,
        ).exists()

        if recent_crisis:
            return TriggerResult(
                should_trigger=True,
                tier=TriggerTier.CRITICAL,
                reason='Recent crisis event detected within 24 hours',
            )

        # Check safety assessment for high risk
        try:
            assessment = SafetyAssessment.objects.get(user_id=user_id)
            if assessment.risk_level == 'high':
                return TriggerResult(
                    should_trigger=True,
                    tier=TriggerTier.CRITICAL,
                    reason='User has high-risk safety assessment',
                )
        except SafetyAssessment.DoesNotExist:
            pass

        # Check for high-severity patterns in recent conversations
        from apps.patterns.models import Pattern

        high_severity_count = Pattern.objects.filter(
            user_id=user_id,
            created_at__gte=recent_cutoff,
            severity__gte=4,
        ).count()

        if high_severity_count >= 3:
            return TriggerResult(
                should_trigger=True,
                tier=TriggerTier.CRITICAL,
                reason=f'{high_severity_count} high-severity patterns detected in 24 hours',
            )

        return TriggerResult(should_trigger=False)

    def _check_threshold_breach(self, user_id):
        """Check for significant changes exceeding thresholds."""
        from apps.checkins.models import DailyCheckIn

        escalation_threshold = self.config.get('escalation_threshold', 7)
        mood_decline_days = self.config.get('mood_decline_days', 3)

        # Check escalation score threshold
        from apps.patterns.models import InsightSummary

        recent_insight = (
            InsightSummary.objects
            .filter(user_id=user_id)
            .order_by('-created_at')
            .first()
        )

        if recent_insight and recent_insight.escalation_score >= escalation_threshold:
            return TriggerResult(
                should_trigger=True,
                tier=TriggerTier.THRESHOLD,
                reason=f'Escalation score {recent_insight.escalation_score} >= threshold {escalation_threshold}',
            )

        # Check mood declining for N consecutive days
        recent_checkins = list(
            DailyCheckIn.objects
            .filter(user_id=user_id)
            .order_by('-date')[:mood_decline_days + 1]
            .values_list('mood', flat=True)
        )

        if len(recent_checkins) >= mood_decline_days:
            # Check if moods are strictly declining
            declining = all(
                recent_checkins[i] > recent_checkins[i + 1]
                for i in range(mood_decline_days - 1)
            )
            # recent_checkins is newest first, so index 0 is latest
            # declining means each older checkin has higher mood than newer
            if declining:
                return TriggerResult(
                    should_trigger=True,
                    tier=TriggerTier.THRESHOLD,
                    reason=f'Mood declining for {mood_decline_days}+ consecutive days',
                )

        # Check health score drop
        try:
            from apps.patterns.models import DailyHealthScore

            recent_scores = list(
                DailyHealthScore.objects
                .filter(user_id=user_id)
                .order_by('-date')[:7]
                .values_list('score', flat=True)
            )

            if len(recent_scores) >= 2:
                latest = recent_scores[0]
                oldest = recent_scores[-1]
                drop = oldest - latest
                if drop >= 15:
                    return TriggerResult(
                        should_trigger=True,
                        tier=TriggerTier.THRESHOLD,
                        reason=f'Health score dropped {drop} points (from {oldest} to {latest})',
                    )
        except Exception:
            pass

        return TriggerResult(should_trigger=False)

    def _check_data_sufficiency(self, user_id):
        """Check if enough data has accumulated for meaningful analysis."""
        from apps.chat.models import Conversation, Message
        from apps.checkins.models import DailyCheckIn

        min_conversations = self.config.get('min_conversations', 3)
        min_messages = self.config.get('min_messages_per_conversation', 5)
        min_checkin_days = self.config.get('min_checkin_days', 3)

        # Check if there's already a completed report (sufficiency is one-time trigger)
        from apps.intelligence.models import InsightReport

        has_report = InsightReport.objects.filter(
            user_id=user_id,
            status='completed',
        ).exists()

        if has_report:
            return TriggerResult(should_trigger=False)

        # Count qualifying conversations (with enough messages)
        recent_cutoff = timezone.now() - timedelta(days=14)
        conversations = Conversation.objects.filter(
            user_id=user_id,
            created_at__gte=recent_cutoff,
        )

        qualifying_convs = 0
        for conv in conversations:
            msg_count = Message.objects.filter(
                conversation=conv, role='user'
            ).count()
            if msg_count >= min_messages:
                qualifying_convs += 1

        if qualifying_convs < min_conversations:
            return TriggerResult(should_trigger=False)

        # Check checkin completion
        checkin_count = DailyCheckIn.objects.filter(
            user_id=user_id,
            date__gte=recent_cutoff.date(),
        ).count()

        if checkin_count < min_checkin_days:
            return TriggerResult(should_trigger=False)

        # Check cooldown usage (any cooldown sessions indicate conflict data)
        from apps.cooldown.models import CoolDown

        has_cooldown_data = CoolDown.objects.filter(user_id=user_id).exists()

        return TriggerResult(
            should_trigger=True,
            tier=TriggerTier.SUFFICIENCY,
            reason=(
                f'Data sufficiency met: {qualifying_convs} conversations, '
                f'{checkin_count} check-ins'
                f'{", cooldown data available" if has_cooldown_data else ""}'
            ),
        )

    def _check_periodic_schedule(self, user_id):
        """Check if it's the weekly analysis day."""
        weekly_day = self.config.get('weekly_analysis_day', 0)  # 0 = Monday
        today = timezone.now().date()

        if today.weekday() != weekly_day:
            return TriggerResult(should_trigger=False)

        # Ensure there's at least some data to analyze
        from apps.chat.models import Conversation

        week_cutoff = timezone.now() - timedelta(days=7)
        has_activity = Conversation.objects.filter(
            user_id=user_id,
            created_at__gte=week_cutoff,
        ).exists()

        if not has_activity:
            return TriggerResult(
                should_trigger=False,
                reason='Periodic day but no recent activity',
            )

        return TriggerResult(
            should_trigger=True,
            tier=TriggerTier.PERIODIC,
            reason='Weekly periodic analysis day',
        )
