"""Therapy data collector for intelligence analysis.

Aggregates data from all app sources into a unified intelligence context
for AI-powered analysis and insight generation.
"""

import logging
from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone

logger = logging.getLogger(__name__)


class TherapyDataCollector:
    """Aggregates data from all app sources into unified intelligence context.

    Data sources: Messages, DailyCheckIns, AudioRecordings, CoupleActivities,
    Patterns, InsightSummaries, WeeklySummaries, UserProfile, UserGoals.
    """

    def __init__(self, user_id):
        self.user_id = user_id

    def collect_therapy_context(self, lookback_days=14):
        """Collect all available data for analysis."""
        return {
            'user_profile': self._get_user_profile(),
            'mood_trajectory': self._get_mood_trajectory(lookback_days),
            'conversation_summaries': self._get_conversation_summaries(lookback_days),
            'accumulated_patterns': self._get_accumulated_patterns(lookback_days),
            'audio_insights': self._get_audio_insights(lookback_days),
            'activity_engagement': self._get_activity_engagement(lookback_days),
            'weekly_summaries': self._get_weekly_summaries(lookback_days),
            'health_score': self._get_health_score_data(),
            'conflict_info': self._get_conflict_information(),
        }

    def _get_user_profile(self):
        """Get user profile and goals data."""
        from apps.onboarding.models import UserGoals, UserProfile

        profile_data = {
            'attachment_anxiety': None,
            'attachment_avoidance': None,
            'conflict_style': None,
            'communication_frequency': None,
            'primary_goal': None,
            'focus_areas': [],
        }

        try:
            profile = UserProfile.objects.get(user_id=self.user_id)
            profile_data.update({
                'attachment_anxiety': profile.attachment_anxiety,
                'attachment_avoidance': profile.attachment_avoidance,
                'conflict_style': profile.conflict_style,
                'communication_frequency': profile.communication_frequency,
            })
        except UserProfile.DoesNotExist:
            logger.debug("No UserProfile for user %s", self.user_id)

        try:
            goals = UserGoals.objects.get(user_id=self.user_id)
            profile_data.update({
                'primary_goal': goals.primary_goal,
                'focus_areas': goals.focus_areas,
            })
        except UserGoals.DoesNotExist:
            logger.debug("No UserGoals for user %s", self.user_id)

        return profile_data

    def _get_mood_trajectory(self, days):
        """Get mood check-in trajectory and trends."""
        from apps.checkins.models import DailyCheckIn

        cutoff = timezone.now().date() - timedelta(days=days)
        checkins = (
            DailyCheckIn.objects
            .filter(user_id=self.user_id, date__gte=cutoff)
            .order_by('date')
            .values('date', 'mood', 'note')
        )

        checkin_list = list(checkins)
        if not checkin_list:
            return {
                'checkins': [],
                'average_mood': None,
                'trend': 'insufficient_data',
                'notes_summary': [],
            }

        moods = [c['mood'] for c in checkin_list]
        average = sum(moods) / len(moods)

        # Compute trend: compare first half vs second half
        mid = len(moods) // 2
        if mid > 0:
            first_half_avg = sum(moods[:mid]) / mid
            second_half_avg = sum(moods[mid:]) / (len(moods) - mid)
            diff = second_half_avg - first_half_avg
            if diff > 0.3:
                trend = 'improving'
            elif diff < -0.3:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'

        notes = [
            {'date': str(c['date']), 'note': c['note']}
            for c in checkin_list
            if c['note']
        ]

        return {
            'checkins': [
                {'date': str(c['date']), 'mood': c['mood']}
                for c in checkin_list
            ],
            'average_mood': round(average, 2),
            'trend': trend,
            'notes_summary': notes,
        }

    def _get_conversation_summaries(self, days):
        """Get conversation activity and summaries."""
        from apps.chat.models import Conversation, ConversationSummary, Message

        cutoff = timezone.now() - timedelta(days=days)
        conversations = (
            Conversation.objects
            .filter(user_id=self.user_id, created_at__gte=cutoff)
            .order_by('-created_at')
        )

        result = []
        for conv in conversations:
            msg_count = Message.objects.filter(conversation=conv).count()
            user_msg_count = Message.objects.filter(
                conversation=conv, role='user'
            ).count()

            summary_text = None
            try:
                summary = ConversationSummary.objects.filter(
                    conversation=conv
                ).order_by('-created_at').first()
                if summary:
                    summary_text = summary.summary_text
            except Exception:
                pass

            result.append({
                'conversation_id': str(conv.id),
                'type': conv.conversation_type,
                'title': conv.title,
                'message_count': msg_count,
                'user_message_count': user_msg_count,
                'summary': summary_text,
                'emotion_indicator': conv.emotion_indicator,
                'created_at': conv.created_at.isoformat(),
            })

        return {
            'total_conversations': len(result),
            'conversations': result,
        }

    def _get_accumulated_patterns(self, days):
        """Get detected patterns and insight summaries."""
        from apps.patterns.models import InsightSummary, Pattern

        cutoff = timezone.now() - timedelta(days=days)

        patterns = (
            Pattern.objects
            .filter(user_id=self.user_id, created_at__gte=cutoff)
            .values('pattern_type', 'content', 'category', 'severity', 'created_at')
        )

        pattern_list = [
            {
                'type': p['pattern_type'],
                'content': p['content'],
                'category': p['category'],
                'severity': p['severity'],
                'date': p['created_at'].isoformat(),
            }
            for p in patterns
        ]

        # Aggregate by category
        category_counts = {}
        for p in pattern_list:
            cat = p['category'] or 'uncategorized'
            category_counts[cat] = category_counts.get(cat, 0) + 1

        # Get insight summaries
        insights = (
            InsightSummary.objects
            .filter(user_id=self.user_id, created_at__gte=cutoff)
            .order_by('-created_at')
        )

        insight_list = []
        escalation_scores = []
        all_trigger_phrases = []
        all_recurring_topics = []

        for ins in insights:
            escalation_scores.append(ins.escalation_score)
            if ins.trigger_phrases:
                all_trigger_phrases.extend(ins.trigger_phrases)
            if ins.recurring_topics:
                all_recurring_topics.extend(ins.recurring_topics)
            insight_list.append({
                'escalation_score': ins.escalation_score,
                'trigger_phrases': ins.trigger_phrases,
                'recurring_topics': ins.recurring_topics,
                'summary': ins.ai_summary,
                'date': ins.created_at.isoformat(),
            })

        avg_escalation = (
            round(sum(escalation_scores) / len(escalation_scores), 2)
            if escalation_scores else None
        )

        return {
            'patterns': pattern_list,
            'category_distribution': category_counts,
            'insights': insight_list,
            'average_escalation': avg_escalation,
            'trigger_phrases': all_trigger_phrases,
            'recurring_topics': all_recurring_topics,
        }

    def _get_audio_insights(self, days):
        """Get audio recording insights if available."""
        try:
            from apps.audio.models import AudioRecording
        except ImportError:
            return {'available': False, 'recordings': []}

        cutoff = timezone.now() - timedelta(days=days)
        recordings = (
            AudioRecording.objects
            .filter(
                user_id=self.user_id,
                created_at__gte=cutoff,
                status='completed',
            )
            .order_by('-created_at')
        )

        recording_list = []
        for rec in recordings:
            segment_count = 0
            try:
                segment_count = rec.segments.count()
            except Exception:
                pass

            recording_list.append({
                'id': str(rec.id),
                'type': rec.recording_type,
                'duration': rec.duration,
                'emotion_intensity': rec.emotion_intensity,
                'segment_count': segment_count,
                'date': rec.created_at.isoformat(),
            })

        return {
            'available': True,
            'total_recordings': len(recording_list),
            'recordings': recording_list,
        }

    def _get_activity_engagement(self, days):
        """Get couple activity engagement data."""
        from apps.activities.models import CoupleActivity

        cutoff = timezone.now() - timedelta(days=days)

        # Get user's couple ID first
        try:
            from apps.couples.models import Couple
            couple = Couple.objects.filter(
                Q(user1_id=self.user_id) | Q(user2_id=self.user_id)
            ).first()
        except Exception:
            couple = None

        if not couple:
            return {
                'completed_count': 0,
                'average_rating': None,
                'trend': 'no_couple',
                'activities': [],
            }

        activities = (
            CoupleActivity.objects
            .filter(couple=couple, created_at__gte=cutoff)
            .select_related('activity')
            .order_by('-created_at')
        )

        completed = [a for a in activities if a.status == 'completed']
        ratings = [a.rating for a in completed if a.rating is not None]

        activity_list = [
            {
                'title': a.activity.title,
                'category': a.activity.category,
                'status': a.status,
                'rating': a.rating,
                'completed_at': a.completed_at.isoformat() if a.completed_at else None,
            }
            for a in activities
        ]

        avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

        return {
            'completed_count': len(completed),
            'average_rating': avg_rating,
            'trend': 'active' if len(completed) >= 2 else 'low_engagement',
            'activities': activity_list,
        }

    def _get_weekly_summaries(self, days):
        """Get weekly pattern summaries."""
        from apps.patterns.models import WeeklySummary

        cutoff = timezone.now().date() - timedelta(days=days)
        summaries = (
            WeeklySummary.objects
            .filter(user_id=self.user_id, period_end__gte=cutoff)
            .order_by('-period_end')
        )

        return [
            {
                'period_start': str(s.period_start),
                'period_end': str(s.period_end),
                'session_count': s.session_count,
                'top_topics': s.top_topics,
                'trigger_frequency': s.trigger_frequency,
                'escalation_trend': s.escalation_trend,
                'trend_text': s.trend_text,
            }
            for s in summaries
        ]

    def _get_health_score_data(self):
        """Get daily health score if model exists."""
        try:
            from apps.patterns.models import DailyHealthScore
            score = (
                DailyHealthScore.objects
                .filter(user_id=self.user_id)
                .order_by('-date')
                .first()
            )
            if score:
                return {
                    'available': True,
                    'date': str(score.date),
                    'score': score.score,
                }
        except (ImportError, Exception):
            pass

        return {'available': False}

    def _get_conflict_information(self):
        """Get cooldown/conflict information."""
        from apps.cooldown.models import CoolDown

        recent_cooldowns = (
            CoolDown.objects
            .filter(user_id=self.user_id)
            .order_by('-started_at')[:5]
        )

        cooldown_list = [
            {
                'duration_seconds': cd.duration_seconds,
                'started_at': cd.started_at.isoformat(),
                'completed': cd.completed_at is not None,
            }
            for cd in recent_cooldowns
        ]

        return {
            'recent_cooldowns': cooldown_list,
            'total_recent': len(cooldown_list),
        }
