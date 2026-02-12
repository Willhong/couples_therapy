"""Recommendation service (D1-D2).

Generates personalized activity and prompt recommendations based on
health score components and user context.
"""

import logging
from datetime import timedelta

from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone

logger = logging.getLogger(__name__)

CACHE_KEY_PREFIX = 'recommendations'
CACHE_TIMEOUT = 6 * 3600  # 6 hours

# Max recommendations by communication frequency
FREQUENCY_LIMITS = {
    'rarely': 2,
    'weekly': 3,
    'daily': 5,
}
DEFAULT_LIMIT = 3

# Weakness threshold: below 50% of component max
WEAKNESS_THRESHOLD = 0.5

# Component max scores (must match health_score.py)
COMPONENT_MAX = {
    'mood': 25,
    'escalation': 25,
    'engagement': 20,
    'pattern_severity': 15,
    'cooldown': 15,
}


class RecommendationService:
    """Generates personalized recommendations from health score weaknesses."""

    @classmethod
    def get_recommendations(cls, user_id: int, couple_id: int | None = None) -> list[dict]:
        """Return cached recommendations for a user.

        Args:
            user_id: User to generate recommendations for.
            couple_id: Optional couple for couple-specific activities.

        Returns:
            List of recommendation dicts.
        """
        cache_key = f'{CACHE_KEY_PREFIX}:{user_id}'
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        recs = cls._build_recommendations(user_id, couple_id)
        cache.set(cache_key, recs, CACHE_TIMEOUT)
        return recs

    @classmethod
    def invalidate_cache(cls, user_id: int) -> None:
        cache.delete(f'{CACHE_KEY_PREFIX}:{user_id}')

    @classmethod
    def _build_recommendations(cls, user_id: int, couple_id: int | None) -> list[dict]:
        from apps.patterns.services.health_score import HealthScoreService
        from apps.core.services.user_intelligence import UserIntelligenceService

        # Get health score components
        health = HealthScoreService().compute(user_id, couple_id=couple_id)
        components = health.get('components', {})

        # Get user context for communication_frequency
        ctx = UserIntelligenceService.get_ai_context(user_id)
        comm_freq = ctx.get('communication_frequency') or 'weekly'
        max_recs = FREQUENCY_LIMITS.get(comm_freq, DEFAULT_LIMIT)

        # Identify weaknesses
        weaknesses = []
        for name, score in components.items():
            if isinstance(score, dict):
                score_val = score.get('score', 0)
            else:
                score_val = score
            max_val = COMPONENT_MAX.get(name, 1)
            if score_val / max_val < WEAKNESS_THRESHOLD:
                weaknesses.append(name)

        # Build recommendations from weaknesses
        recs = []
        for weakness in weaknesses:
            recs.extend(cls._recommend_for_weakness(weakness, user_id, couple_id))

        # Check InsightReport for active recommendations (priority)
        insight_recs = cls._get_insight_recommendations(user_id)
        if insight_recs:
            # InsightReport recommendations go first, then deduplicate
            seen_ids = set()
            merged = []
            for r in insight_recs:
                key = (r['type'], r.get('item_id'))
                if key not in seen_ids:
                    seen_ids.add(key)
                    merged.append(r)
            for r in recs:
                key = (r['type'], r.get('item_id'))
                if key not in seen_ids:
                    seen_ids.add(key)
                    merged.append(r)
            recs = merged

        # Filter out already-completed activities (14 days)
        if couple_id:
            recs = cls._filter_completed(recs, couple_id)

        # Solo handling: skip couple-specific activities
        if couple_id is None:
            recs = [r for r in recs if r.get('type') != 'couple_activity']

        return recs[:max_recs]

    @classmethod
    def _recommend_for_weakness(
        cls, weakness: str, user_id: int, couple_id: int | None
    ) -> list[dict]:
        """Map a weakness to concrete recommendations."""
        from apps.activities.models import Activity
        from apps.prompts.models import DailyPrompt

        recs = []

        if weakness == 'mood':
            # Gratitude prompts + date activities
            prompts = DailyPrompt.objects.filter(
                category='gratitude', is_active=True,
            ).order_by('?')[:2]
            for p in prompts:
                recs.append({
                    'type': 'prompt',
                    'item_id': p.id,
                    'title': p.text_ko[:60],
                    'reason': '최근 기분이 낮아 감사 표현을 연습해 보세요.',
                    'priority': 2,
                    'source': 'health_score',
                })

            activities = Activity.objects.filter(
                category='date', is_active=True,
            ).order_by('?')[:1]
            for a in activities:
                recs.append({
                    'type': 'couple_activity',
                    'item_id': a.id,
                    'title': a.title,
                    'reason': '기분 전환을 위한 데이트 활동을 추천합니다.',
                    'priority': 3,
                    'source': 'health_score',
                })

        elif weakness == 'escalation':
            # Conversation activities (lower difficulty) + cooldown reminders
            activities = Activity.objects.filter(
                category='conversation', is_active=True, difficulty__lte=2,
            ).order_by('?')[:1]
            for a in activities:
                recs.append({
                    'type': 'couple_activity',
                    'item_id': a.id,
                    'title': a.title,
                    'reason': '갈등 완화를 위한 가벼운 대화 활동입니다.',
                    'priority': 1,
                    'source': 'health_score',
                })
            recs.append({
                'type': 'tip',
                'item_id': None,
                'title': '쿨다운 타이머를 활용하세요',
                'reason': '대화가 격해질 때 잠시 쉬어가면 도움이 됩니다.',
                'priority': 1,
                'source': 'health_score',
            })

        elif weakness == 'engagement':
            # Easy/short activities + streak motivation
            activities = Activity.objects.filter(
                is_active=True, difficulty=1,
            ).order_by('estimated_minutes')[:1]
            for a in activities:
                recs.append({
                    'type': 'couple_activity',
                    'item_id': a.id,
                    'title': a.title,
                    'reason': '짧고 쉬운 활동으로 참여를 시작해 보세요.',
                    'priority': 2,
                    'source': 'health_score',
                })
            recs.append({
                'type': 'tip',
                'item_id': None,
                'title': '매일 체크인으로 연속 기록을 쌓아보세요',
                'reason': '꾸준한 체크인이 관계 개선에 큰 도움이 됩니다.',
                'priority': 2,
                'source': 'health_score',
            })

        elif weakness == 'pattern_severity':
            # Deep conversation prompts
            prompts = DailyPrompt.objects.filter(
                category='deep', is_active=True,
            ).order_by('?')[:1]
            for p in prompts:
                recs.append({
                    'type': 'prompt',
                    'item_id': p.id,
                    'title': p.text_ko[:60],
                    'reason': '새로운 소통 방법을 시도해 보세요.',
                    'priority': 2,
                    'source': 'health_score',
                })

        elif weakness == 'cooldown':
            recs.append({
                'type': 'tip',
                'item_id': None,
                'title': '갈등 예방 전략을 세워보세요',
                'reason': '쿨다운 사용이 잦습니다. 갈등 전 신호를 인식하는 연습을 해보세요.',
                'priority': 1,
                'source': 'health_score',
            })

        return recs

    @classmethod
    def _get_insight_recommendations(cls, user_id: int) -> list[dict]:
        """Get recommendations from InsightReport if available."""
        try:
            from apps.intelligence.models import InsightReport
            report = InsightReport.objects.filter(
                user_id=user_id,
                status='delivered',
            ).order_by('-created_at').first()
            if not report or not report.recommendations:
                return []
            # Convert InsightReport recommendations to our format
            recs = []
            for r in report.recommendations[:5]:
                recs.append({
                    'type': r.get('type', 'tip'),
                    'item_id': r.get('item_id'),
                    'title': r.get('title', ''),
                    'reason': r.get('reason', ''),
                    'priority': r.get('priority', 1),
                    'source': 'insight_report',
                })
            return recs
        except Exception:
            # InsightReport model may not exist yet
            return []

    @classmethod
    def _filter_completed(cls, recs: list[dict], couple_id: int) -> list[dict]:
        """Remove activities completed in the last 14 days."""
        from apps.activities.models import CoupleActivity

        cutoff = timezone.now() - timedelta(days=14)
        completed_ids = set(
            CoupleActivity.objects.filter(
                couple_id=couple_id,
                status='completed',
                completed_at__gte=cutoff,
            ).values_list('activity_id', flat=True)
        )

        return [
            r for r in recs
            if r['type'] != 'couple_activity' or r.get('item_id') not in completed_ids
        ]
