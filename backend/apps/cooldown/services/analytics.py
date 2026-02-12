"""Cooldown analytics service.

Tracks cooldown usage as an escalation signal.
"""

import logging
from collections import Counter
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Count, F, Q

logger = logging.getLogger(__name__)


class CooldownAnalyticsService:
    """Analyzes cooldown usage patterns."""

    def analyze(self, user_id, couple_id=None, days=30):
        """Compute cooldown analytics.

        Args:
            user_id: User ID
            couple_id: Optional couple ID for couple-level analytics
            days: Lookback period

        Returns:
            dict with cooldown stats, trends, high stress days
        """
        from apps.cooldown.models import CoolDown

        cutoff = timezone.now() - timedelta(days=days)

        # Base queryset
        qs = CoolDown.objects.filter(user_id=user_id, started_at__gte=cutoff)
        if couple_id:
            qs = qs.filter(couple_id=couple_id)

        cooldowns = list(qs.order_by('started_at').values(
            'id', 'started_at', 'completed_at', 'duration_seconds', 'is_active'
        ))

        if not cooldowns:
            return self._empty_result()

        total_30d = len(cooldowns)

        # This week vs last week
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)

        this_week = sum(1 for c in cooldowns if c['started_at'] >= week_ago)
        last_week = sum(1 for c in cooldowns if two_weeks_ago <= c['started_at'] < week_ago)

        # Trend
        if this_week < last_week:
            trend = 'improving'
        elif this_week > last_week:
            trend = 'worsening'
        else:
            trend = 'stable'

        # Average duration
        durations = [c['duration_seconds'] for c in cooldowns if c['duration_seconds']]
        avg_duration = sum(durations) / len(durations) if durations else 0

        # Completion rate
        completed = sum(1 for c in cooldowns if c['completed_at'] is not None)
        completion_rate = round(completed / total_30d, 2) if total_30d else 0

        # High stress days (2+ cooldowns in 24h)
        high_stress_days = self._find_high_stress_days(cooldowns)

        # Correlation with escalation
        correlation = self._compute_escalation_correlation(user_id, cooldowns)

        return {
            'total_30d': total_30d,
            'this_week': this_week,
            'last_week': last_week,
            'trend': trend,
            'avg_duration_seconds': round(avg_duration),
            'completion_rate': completion_rate,
            'high_stress_days': high_stress_days,
            'correlation_with_escalation': correlation,
        }

    def _empty_result(self):
        return {
            'total_30d': 0,
            'this_week': 0,
            'last_week': 0,
            'trend': 'stable',
            'avg_duration_seconds': 0,
            'completion_rate': 0,
            'high_stress_days': [],
            'correlation_with_escalation': None,
        }

    def _find_high_stress_days(self, cooldowns):
        """Find days with 2+ cooldowns."""
        day_counts = Counter()
        for c in cooldowns:
            day = c['started_at'].date().isoformat()
            day_counts[day] += 1
        return sorted([day for day, count in day_counts.items() if count >= 2])

    def _compute_escalation_correlation(self, user_id, cooldowns):
        """Compute correlation between cooldowns and escalation scores."""
        from apps.patterns.models import InsightSummary

        cooldown_dates = {c['started_at'].date() for c in cooldowns}
        if not cooldown_dates:
            return None

        # Get escalation scores on cooldown days vs non-cooldown days
        insights = list(
            InsightSummary.objects.filter(
                user_id=user_id,
            ).values('created_at', 'escalation_score')
        )

        if len(insights) < 3:
            return None

        cooldown_scores = [i['escalation_score'] for i in insights if i['created_at'].date() in cooldown_dates]
        other_scores = [i['escalation_score'] for i in insights if i['created_at'].date() not in cooldown_dates]

        if not cooldown_scores or not other_scores:
            return None

        avg_cooldown = sum(cooldown_scores) / len(cooldown_scores)
        avg_other = sum(other_scores) / len(other_scores)

        # Simple correlation proxy: difference ratio
        if avg_other == 0:
            return None
        return round(avg_cooldown / max(avg_other, 0.1), 2)
