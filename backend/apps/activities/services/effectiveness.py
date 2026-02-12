"""Activity effectiveness tracking (F1).

Tracks per-activity-type effectiveness by measuring avg rating
and mood impact (whether mood improved in next check-in post-activity).
"""

import logging
from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone

logger = logging.getLogger(__name__)


class ActivityEffectivenessService:
    """Tracks and reports activity effectiveness."""

    @classmethod
    def get_effectiveness(cls, couple_id: int, days: int = 30) -> list[dict]:
        """Compute effectiveness metrics per activity category.

        Args:
            couple_id: Couple to analyze.
            days: Lookback period.

        Returns:
            List of dicts with category, avg_rating, mood_impact, count.
        """
        from apps.activities.models import CoupleActivity, Activity

        cutoff = timezone.now() - timedelta(days=days)
        completed = CoupleActivity.objects.filter(
            couple_id=couple_id,
            status='completed',
            completed_at__gte=cutoff,
        ).select_related('activity')

        if not completed.exists():
            return []

        # Group by activity category
        category_stats = (
            completed
            .values('activity__category')
            .annotate(
                avg_rating=Avg('rating'),
                count=Count('id'),
            )
            .order_by('-avg_rating')
        )

        results = []
        for stat in category_stats:
            category = stat['activity__category']
            avg_rating = stat['avg_rating']
            count = stat['count']

            # Clamp rating defensively
            if avg_rating is not None:
                avg_rating = max(0.0, min(5.0, round(avg_rating, 1)))

            # Compute mood impact for this category
            mood_impact = cls._compute_mood_impact(couple_id, category, cutoff)

            results.append({
                'category': category,
                'avg_rating': avg_rating,
                'mood_impact': mood_impact,
                'count': count,
            })

        return results

    @classmethod
    def _compute_mood_impact(
        cls, couple_id: int, category: str, cutoff
    ) -> float | None:
        """Check if mood improved in next check-in after completing activities."""
        from apps.activities.models import CoupleActivity
        from apps.checkins.models import DailyCheckIn
        from apps.couples.models import Couple

        try:
            couple = Couple.objects.get(pk=couple_id)
        except Couple.DoesNotExist:
            return None

        user_ids = [couple.user1_id]
        if couple.user2_id:
            user_ids.append(couple.user2_id)

        activities = CoupleActivity.objects.filter(
            couple_id=couple_id,
            status='completed',
            activity__category=category,
            completed_at__gte=cutoff,
        ).values_list('completed_at', flat=True)

        if not activities:
            return None

        improvements = 0
        comparisons = 0

        for completed_at in activities:
            activity_date = completed_at.date()
            next_day = activity_date + timedelta(days=1)
            prev_day = activity_date - timedelta(days=1)

            for uid in user_ids:
                before = DailyCheckIn.objects.filter(
                    user_id=uid, date=prev_day,
                ).values_list('mood', flat=True).first()

                after = DailyCheckIn.objects.filter(
                    user_id=uid, date=next_day,
                ).values_list('mood', flat=True).first()

                if before is not None and after is not None:
                    comparisons += 1
                    if after > before:
                        improvements += 1

        if comparisons == 0:
            return None

        return round(improvements / comparisons, 2)
