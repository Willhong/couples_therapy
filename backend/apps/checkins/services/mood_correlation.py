"""Mood-pattern correlation service.

Correlates mood check-in data with conversation patterns to detect
mood-conflict relationships.
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Count, Q

logger = logging.getLogger(__name__)


class MoodPatternService:
    """Correlates mood check-ins with conversation patterns."""

    def correlate(self, user_id, days=30):
        """Compute mood-pattern correlations for a user.

        Args:
            user_id: User ID to analyze
            days: Lookback period in days

        Returns:
            dict with mood_trend, averages, correlations, risk_days
        """
        from apps.checkins.models import DailyCheckIn
        from apps.patterns.models import InsightSummary
        from apps.cooldown.models import CoolDown

        cutoff = timezone.now().date() - timedelta(days=days)

        # Load check-ins
        checkins = list(
            DailyCheckIn.objects.filter(
                user_id=user_id,
                date__gte=cutoff,
            ).order_by('date').values('date', 'mood', 'answers')
        )

        if not checkins:
            return self._empty_result()

        # Compute basic mood stats
        moods = [c['mood'] for c in checkins]
        avg_mood_30d = sum(moods) / len(moods) if moods else None

        recent_7d = [c['mood'] for c in checkins if c['date'] >= timezone.now().date() - timedelta(days=7)]
        avg_mood_7d = sum(recent_7d) / len(recent_7d) if recent_7d else avg_mood_30d

        # Mood trend (7-day moving average direction)
        mood_trend = self._compute_trend(checkins)

        # Correlation with InsightSummary (conflict days)
        has_insights = InsightSummary.objects.filter(user_id=user_id).exists()
        conflict_day_mood_avg = None
        non_conflict_day_mood_avg = None

        if has_insights:
            # Get dates that had conversations with insights
            insight_dates = set(
                InsightSummary.objects.filter(
                    user_id=user_id,
                    created_at__date__gte=cutoff,
                ).values_list('created_at__date', flat=True)
            )

            conflict_moods = [c['mood'] for c in checkins if c['date'] in insight_dates]
            non_conflict_moods = [c['mood'] for c in checkins if c['date'] not in insight_dates]

            if conflict_moods:
                conflict_day_mood_avg = round(sum(conflict_moods) / len(conflict_moods), 1)
            if non_conflict_moods:
                non_conflict_day_mood_avg = round(sum(non_conflict_moods) / len(non_conflict_moods), 1)

        # Mood after cooldown
        mood_after_cooldown_avg = self._compute_post_cooldown_mood(user_id, checkins, cutoff)

        # Risk days: mood < 3 AND escalation_score > 5 on same day
        risk_days_count = self._count_risk_days(user_id, checkins, cutoff)

        # Check for detailed answers
        has_detailed_answers = any(c['answers'] is not None for c in checkins)

        # Generate correlation insight
        correlation_insight = self._generate_insight(
            conflict_day_mood_avg, non_conflict_day_mood_avg, avg_mood_30d
        )

        return {
            'mood_trend': mood_trend,
            'avg_mood_7d': round(avg_mood_7d, 1) if avg_mood_7d else None,
            'avg_mood_30d': round(avg_mood_30d, 1) if avg_mood_30d else None,
            'conflict_day_mood_avg': conflict_day_mood_avg,
            'non_conflict_day_mood_avg': non_conflict_day_mood_avg,
            'mood_after_cooldown_avg': mood_after_cooldown_avg,
            'risk_days_count': risk_days_count,
            'has_detailed_answers': has_detailed_answers,
            'correlation_insight': correlation_insight,
        }

    def _empty_result(self):
        return {
            'mood_trend': None,
            'avg_mood_7d': None,
            'avg_mood_30d': None,
            'conflict_day_mood_avg': None,
            'non_conflict_day_mood_avg': None,
            'mood_after_cooldown_avg': None,
            'risk_days_count': 0,
            'has_detailed_answers': False,
            'correlation_insight': None,
        }

    def _compute_trend(self, checkins):
        """Compute 7-day moving average trend direction."""
        if len(checkins) < 3:
            return 'stable'
        recent = checkins[-7:] if len(checkins) >= 7 else checkins
        mid = len(recent) // 2
        first_half = sum(c['mood'] for c in recent[:mid]) / max(mid, 1)
        second_half = sum(c['mood'] for c in recent[mid:]) / max(len(recent) - mid, 1)
        diff = second_half - first_half
        if diff > 0.3:
            return 'improving'
        elif diff < -0.3:
            return 'declining'
        return 'stable'

    def _compute_post_cooldown_mood(self, user_id, checkins, cutoff):
        """Compute average mood on days after cooldown sessions."""
        from apps.cooldown.models import CoolDown
        cooldown_dates = set(
            CoolDown.objects.filter(
                user_id=user_id,
                started_at__date__gte=cutoff,
            ).values_list('started_at__date', flat=True)
        )
        if not cooldown_dates:
            return None
        # Get mood on the day after each cooldown
        next_day_moods = []
        for c in checkins:
            prev_day = c['date'] - timedelta(days=1)
            if prev_day in cooldown_dates:
                next_day_moods.append(c['mood'])
        return round(sum(next_day_moods) / len(next_day_moods), 1) if next_day_moods else None

    def _count_risk_days(self, user_id, checkins, cutoff):
        """Count days where mood < 3 AND escalation_score > 5."""
        from apps.patterns.models import InsightSummary
        low_mood_dates = {c['date'] for c in checkins if c['mood'] < 3}
        if not low_mood_dates:
            return 0
        high_escalation_dates = set(
            InsightSummary.objects.filter(
                user_id=user_id,
                created_at__date__gte=cutoff,
                escalation_score__gt=5,
            ).values_list('created_at__date', flat=True)
        )
        return len(low_mood_dates & high_escalation_dates)

    def _generate_insight(self, conflict_avg, non_conflict_avg, overall_avg):
        """Generate Korean insight string."""
        if conflict_avg is None or non_conflict_avg is None:
            return None
        diff = non_conflict_avg - conflict_avg
        if diff >= 1.0:
            return f"갈등이 있는 날의 기분이 평소보다 {diff:.1f}점 낮습니다"
        elif diff >= 0.5:
            return f"갈등이 있는 날 기분이 약간 낮은 경향이 있습니다"
        return None
