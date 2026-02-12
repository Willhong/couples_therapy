"""Relationship health score service.

Computes a composite health score (0-100) from five components:
mood, escalation, engagement, pattern severity, and cooldown frequency.
"""

import logging
from datetime import timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)

# ── Tuning Parameters ──────────────────────────────────────────────
MOOD_MAX = 25
ESCALATION_MAX = 25
ENGAGEMENT_MAX = 20
SEVERITY_MAX = 15
COOLDOWN_MAX = 15

MOOD_LOOKBACK_DAYS = 14
ESCALATION_LOOKBACK_DAYS = 14
ENGAGEMENT_STREAK_CAP = 7
ENGAGEMENT_STREAK_POINTS = 10
ENGAGEMENT_ACTIVITY_POINTS = 10
SEVERITY_LOOKBACK_DAYS = 30
COOLDOWN_LOOKBACK_DAYS = 30

# Mood: avg_mood (1-5) * 5, capped at MOOD_MAX
MOOD_MULTIPLIER = 5

# Escalation: (10 - avg_escalation) * 2.5
ESCALATION_BASELINE = 10
ESCALATION_MULTIPLIER = 2.5

# Severity: (5 - avg_severity) * 3
SEVERITY_BASELINE = 5
SEVERITY_MULTIPLIER = 3

# Grade thresholds (Korean labels)
GRADE_THRESHOLDS = [
    (86, '매우 좋음'),
    (71, '양호'),
    (51, '보통'),
    (31, '주의'),
    (0, '위험'),
]
# ────────────────────────────────────────────────────────────────────


class HealthScoreService:
    """Computes relationship health scores from multiple signals."""

    def compute(self, user_id, couple_id=None):
        """Compute the health score for a user (and optionally their couple).

        Args:
            user_id: User ID to analyze.
            couple_id: Optional couple ID for couple-level averaging.

        Returns:
            dict with score, grade, components, trend, insights, partner info.
        """
        components = self._compute_components(user_id)
        score = sum(c['score'] for c in components.values())
        grade = self._grade(score)
        trend = self._compute_trend(user_id)
        insights = self._generate_insights(components, score)

        result = {
            'score': score,
            'grade': grade,
            'components': {k: v for k, v in components.items()},
            'trend': trend,
            'insights': insights,
            'is_couple_score': False,
            'partner_score': None,
        }

        # Couple averaging when both partners have data
        if couple_id:
            partner_id = self._get_partner_id(user_id, couple_id)
            if partner_id:
                partner_components = self._compute_components(partner_id)
                partner_score = sum(c['score'] for c in partner_components.values())
                if partner_score > 0:
                    couple_score = round((score + partner_score) / 2)
                    result['score'] = couple_score
                    result['grade'] = self._grade(couple_score)
                    result['is_couple_score'] = True
                    result['partner_score'] = partner_score

        return result

    # ── Component calculations ──────────────────────────────────────

    def _compute_components(self, user_id):
        """Compute all five score components for a user."""
        return {
            'mood': self._mood_component(user_id),
            'escalation': self._escalation_component(user_id),
            'engagement': self._engagement_component(user_id),
            'pattern_severity': self._severity_component(user_id),
            'cooldown': self._cooldown_component(user_id),
        }

    def _mood_component(self, user_id):
        """Mood (0-25): avg mood over 14 days * 5, capped."""
        from apps.checkins.models import DailyCheckIn

        cutoff = timezone.now().date() - timedelta(days=MOOD_LOOKBACK_DAYS)
        checkins = DailyCheckIn.objects.filter(
            user_id=user_id,
            date__gte=cutoff,
        ).values_list('mood', flat=True)

        moods = list(checkins)
        if not moods:
            return {'score': round(MOOD_MAX * 0.5), 'detail': 'no_data'}

        avg = sum(moods) / len(moods)
        score = min(round(avg * MOOD_MULTIPLIER), MOOD_MAX)
        return {'score': score, 'detail': round(avg, 1)}

    def _escalation_component(self, user_id):
        """Escalation (0-25): (10 - avg_escalation) * 2.5."""
        from apps.patterns.models import InsightSummary

        cutoff = timezone.now() - timedelta(days=ESCALATION_LOOKBACK_DAYS)
        scores = list(
            InsightSummary.objects.filter(
                user_id=user_id,
                created_at__gte=cutoff,
            ).values_list('escalation_score', flat=True)
        )

        if not scores:
            return {'score': round(ESCALATION_MAX * 0.5), 'detail': 'no_data'}

        avg = sum(scores) / len(scores)
        raw = (ESCALATION_BASELINE - avg) * ESCALATION_MULTIPLIER
        score = max(0, min(round(raw), ESCALATION_MAX))
        return {'score': score, 'detail': round(avg, 1)}

    def _engagement_component(self, user_id):
        """Engagement (0-20): streak points + activity completion rate."""
        from apps.checkins.models import Streak
        from apps.activities.models import CoupleActivity

        # Streak points: capped at 7 days = 10 points
        streak_val = 0
        try:
            streak = Streak.objects.get(user_id=user_id)
            streak_val = min(streak.current_streak, ENGAGEMENT_STREAK_CAP)
        except Streak.DoesNotExist:
            pass
        streak_points = round(streak_val / ENGAGEMENT_STREAK_CAP * ENGAGEMENT_STREAK_POINTS)

        # Activity completion rate over 30 days
        cutoff = timezone.now() - timedelta(days=30)
        activities = list(
            CoupleActivity.objects.filter(
                couple__user1_id=user_id,
                created_at__gte=cutoff,
            ).values_list('status', 'rating')
        ) + list(
            CoupleActivity.objects.filter(
                couple__user2_id=user_id,
                created_at__gte=cutoff,
            ).values_list('status', 'rating')
        )

        if activities:
            completed = sum(1 for s, _ in activities if s == 'completed')
            completion_rate = completed / len(activities)
            # Defensive clamp on rating
            ratings = [max(0, min(5, r)) for _, r in activities if r is not None]
            avg_rating = sum(ratings) / len(ratings) if ratings else 3.0
        else:
            completion_rate = 0
            avg_rating = None

        activity_points = round(completion_rate * ENGAGEMENT_ACTIVITY_POINTS)
        score = min(streak_points + activity_points, ENGAGEMENT_MAX)

        return {
            'score': score,
            'detail': {
                'streak': streak_val,
                'completion_rate': round(completion_rate, 2),
                'avg_rating': round(avg_rating, 1) if avg_rating else None,
            },
        }

    def _severity_component(self, user_id):
        """Pattern severity (0-15): (5 - avg_severity) * 3."""
        from apps.patterns.models import Pattern

        cutoff = timezone.now() - timedelta(days=SEVERITY_LOOKBACK_DAYS)
        severities = list(
            Pattern.objects.filter(
                user_id=user_id,
                created_at__gte=cutoff,
            ).values_list('severity', flat=True)
        )

        if not severities:
            return {'score': round(SEVERITY_MAX * 0.5), 'detail': 'no_data'}

        avg = sum(severities) / len(severities)
        raw = (SEVERITY_BASELINE - avg) * SEVERITY_MULTIPLIER
        score = max(0, min(round(raw), SEVERITY_MAX))
        return {'score': score, 'detail': round(avg, 1)}

    def _cooldown_component(self, user_id):
        """Cooldown (0-15): inverse of cooldown frequency trend."""
        from apps.cooldown.models import CoolDown

        now = timezone.now()
        cutoff = now - timedelta(days=COOLDOWN_LOOKBACK_DAYS)

        cooldowns = list(
            CoolDown.objects.filter(
                user_id=user_id,
                started_at__gte=cutoff,
            ).values_list('started_at', flat=True)
        )

        if not cooldowns:
            # No cooldowns needed = good sign
            return {'score': COOLDOWN_MAX, 'detail': 0}

        total = len(cooldowns)
        week_ago = now - timedelta(days=7)
        recent = sum(1 for d in cooldowns if d >= week_ago)
        older = total - recent

        # Fewer recent cooldowns than average = improving
        avg_weekly = total / (COOLDOWN_LOOKBACK_DAYS / 7)
        if avg_weekly == 0:
            score = COOLDOWN_MAX
        else:
            # ratio < 1 means improving, > 1 means worsening
            ratio = recent / avg_weekly
            raw = COOLDOWN_MAX * max(0, 1 - (ratio - 0.5))
            score = max(0, min(round(raw), COOLDOWN_MAX))

        return {'score': score, 'detail': total}

    # ── Trend ───────────────────────────────────────────────────────

    def _compute_trend(self, user_id):
        """Compare current score proxy to 7-day-ago proxy."""
        from apps.patterns.models import DailyHealthScore

        today = timezone.now().date()
        week_ago = today - timedelta(days=7)

        try:
            recent = DailyHealthScore.objects.get(user_id=user_id, date=today)
            past = DailyHealthScore.objects.get(user_id=user_id, date=week_ago)
            diff = recent.score - past.score
            if diff > 3:
                return 'improving'
            elif diff < -3:
                return 'declining'
            return 'stable'
        except DailyHealthScore.DoesNotExist:
            return None

    # ── Grade ───────────────────────────────────────────────────────

    def _grade(self, score):
        """Map score to Korean grade label."""
        for threshold, label in GRADE_THRESHOLDS:
            if score >= threshold:
                return label
        return '위험'

    # ── Insights ────────────────────────────────────────────────────

    def _generate_insights(self, components, score):
        """Generate up to 3 Korean insight strings."""
        insights = []

        # Mood insight
        mood = components['mood']
        if mood['detail'] != 'no_data' and mood['detail'] < 2.5:
            insights.append('최근 2주간 기분이 낮은 편입니다. 자기 돌봄 시간을 가져보세요.')

        # Escalation insight
        esc = components['escalation']
        if esc['detail'] != 'no_data' and esc['detail'] > 6:
            insights.append('대화 중 감정 고조가 자주 발생하고 있습니다.')

        # Engagement insight
        eng = components['engagement']
        if isinstance(eng['detail'], dict):
            if eng['detail']['streak'] == 0:
                insights.append('체크인 연속 기록이 끊겼습니다. 오늘 다시 시작해보세요.')
            elif eng['detail']['completion_rate'] < 0.3:
                insights.append('함께 하는 활동 완료율이 낮습니다. 쉬운 활동부터 시작해보세요.')

        # Cooldown insight
        cd = components['cooldown']
        if cd['detail'] != 'no_data' and isinstance(cd['detail'], (int, float)) and cd['detail'] >= 5:
            insights.append('쿨다운을 자주 사용하고 있습니다. 대화 패턴을 점검해보세요.')

        # Severity insight
        sev = components['pattern_severity']
        if sev['detail'] != 'no_data' and sev['detail'] > 3.5:
            insights.append('반복되는 갈등 패턴의 심각도가 높습니다.')

        return insights[:3]

    # ── Helpers ──────────────────────────────────────────────────────

    def _get_partner_id(self, user_id, couple_id):
        """Get the partner's user ID from a couple."""
        from apps.couples.models import Couple

        try:
            couple = Couple.objects.get(id=couple_id, status=Couple.Status.ACTIVE)
            if str(couple.user1_id) == str(user_id):
                return couple.user2_id
            elif str(couple.user2_id) == str(user_id):
                return couple.user1_id
        except Couple.DoesNotExist:
            pass
        return None
