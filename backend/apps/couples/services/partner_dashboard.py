"""Partner dashboard service (E2).

Privacy: partner patterns are NEVER loaded (queryset-level filtering).
Partner shows only: display_name, mood_avg, checkin_streak, conversation_count.
Solo users get individual-only dashboard.
"""

import logging
from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone

logger = logging.getLogger(__name__)


class PartnerDashboardService:
    """Builds partner dashboard data with strict privacy boundaries."""

    @classmethod
    def get_dashboard(cls, user_id: int, couple_id: int) -> dict:
        """Build dashboard for user within a couple.

        Args:
            user_id: The requesting user.
            couple_id: The couple relationship.

        Returns:
            Dict with user stats and limited partner stats.
        """
        from apps.couples.models import Couple
        from apps.safety.models import SafetyAssessment

        try:
            couple = Couple.objects.select_related('user1', 'user2').get(
                pk=couple_id, status=Couple.Status.ACTIVE,
            )
        except Couple.DoesNotExist:
            return None

        # Check couple_features_enabled
        try:
            sa = SafetyAssessment.objects.get(user_id=user_id)
            if not sa.couple_features_enabled:
                return None
        except SafetyAssessment.DoesNotExist:
            pass

        # Determine user and partner
        if couple.user1_id == user_id:
            partner = couple.user2
        elif couple.user2_id == user_id:
            partner = couple.user1
        else:
            return None

        if partner is None:
            return None

        user_stats = cls._get_user_stats(user_id)
        partner_stats = cls._get_partner_stats(partner)

        return {
            'user': user_stats,
            'partner': partner_stats,
            'couple_id': couple_id,
            'connected_at': couple.connected_at.isoformat() if couple.connected_at else None,
        }

    @classmethod
    def _get_user_stats(cls, user_id: int) -> dict:
        """Full stats for the requesting user."""
        from apps.checkins.models import DailyCheckIn, Streak
        from apps.chat.models import Conversation

        fourteen_days_ago = timezone.now().date() - timedelta(days=14)

        mood_avg = DailyCheckIn.objects.filter(
            user_id=user_id,
            date__gte=fourteen_days_ago,
        ).aggregate(avg=Avg('mood'))['avg']

        try:
            streak = Streak.objects.get(user_id=user_id)
            streak_val = streak.current_streak
        except Streak.DoesNotExist:
            streak_val = 0

        conversation_count = Conversation.objects.filter(
            user_id=user_id,
        ).count()

        return {
            'mood_avg': round(mood_avg, 1) if mood_avg else None,
            'checkin_streak': streak_val,
            'conversation_count': conversation_count,
        }

    @classmethod
    def _get_partner_stats(cls, partner) -> dict:
        """Limited stats for partner - privacy-respecting."""
        from apps.checkins.models import DailyCheckIn, Streak
        from apps.chat.models import Conversation

        fourteen_days_ago = timezone.now().date() - timedelta(days=14)

        # Only aggregate data, never individual patterns
        mood_avg = DailyCheckIn.objects.filter(
            user_id=partner.id,
            date__gte=fourteen_days_ago,
        ).aggregate(avg=Avg('mood'))['avg']

        try:
            streak = Streak.objects.get(user_id=partner.id)
            streak_val = streak.current_streak
        except Streak.DoesNotExist:
            streak_val = 0

        conversation_count = Conversation.objects.filter(
            user_id=partner.id,
        ).count()

        return {
            'display_name': partner.display_name or partner.email.split('@')[0],
            'mood_avg': round(mood_avg, 1) if mood_avg else None,
            'checkin_streak': streak_val,
            'conversation_count': conversation_count,
        }
