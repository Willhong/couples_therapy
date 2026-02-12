"""Celery tasks for pattern analysis and weekly summaries.

analyze_patterns: runs after each session (text or audio).
generate_weekly_summary_task: runs weekly via Celery Beat (Monday 9am KST).
"""

import logging
from datetime import date, timedelta

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=1, default_retry_delay=60)
def analyze_patterns(self, conversation_id: str):
    """Analyze a conversation for communication patterns.

    Called after text chat reframing or audio transcription.
    Errors are caught gracefully to avoid failing the upstream pipeline.

    Args:
        conversation_id: UUID string of the conversation to analyze.
    """
    try:
        from apps.patterns.services.detector import detect_patterns

        result = detect_patterns(conversation_id)
        if result:
            logger.info(f"Pattern analysis completed for conversation {conversation_id}")
        else:
            logger.info(f"No patterns detected for conversation {conversation_id}")
    except Exception as e:
        logger.exception(f"Pattern analysis failed for {conversation_id}: {e}")
        try:
            self.retry(exc=e)
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for pattern analysis on {conversation_id}")


@shared_task
def generate_weekly_summary_task(couple_id: str = None):
    """Generate weekly pattern summaries for all active users or a specific couple.

    Called by Celery Beat every Monday at 9am KST.

    Args:
        couple_id: Optional UUID string to generate for a specific couple only.
    """
    from apps.patterns.services.summarizer import generate_weekly_summary
    from apps.couples.models import Couple

    period_end = date.today() - timedelta(days=1)  # Yesterday
    period_start = period_end - timedelta(days=6)  # Last 7 days

    if couple_id:
        try:
            couple = Couple.objects.get(id=couple_id, status=Couple.Status.ACTIVE)
            couples = [couple]
        except Couple.DoesNotExist:
            logger.error(f"Couple {couple_id} not found or not active")
            return
    else:
        couples = Couple.objects.filter(status=Couple.Status.ACTIVE)

    generated = 0
    for couple in couples:
        for user_id in [str(couple.user1_id), str(couple.user2_id)]:
            try:
                generate_weekly_summary(user_id, period_start, period_end)
                generated += 1
            except Exception as e:
                logger.exception(
                    f"Weekly summary generation failed for user {user_id}: {e}"
                )

    logger.info(f"Weekly summary generation complete: {generated} summaries created")


@shared_task
def compute_daily_health_scores():
    """Compute daily health scores for all active users.

    Called by Celery Beat daily at midnight KST.
    """
    from django.utils import timezone as tz

    from apps.couples.models import Couple
    from apps.patterns.models import DailyHealthScore
    from apps.patterns.services.health_score import HealthScoreService

    service = HealthScoreService()
    today = tz.now().date()

    # Process coupled users
    couples = Couple.objects.filter(status=Couple.Status.ACTIVE)
    computed = 0

    for couple in couples:
        for uid in [couple.user1_id, couple.user2_id]:
            if uid is None:
                continue
            try:
                result = service.compute(uid, couple_id=couple.id)
                DailyHealthScore.objects.update_or_create(
                    user_id=uid,
                    date=today,
                    defaults={
                        'couple_id': couple.id,
                        'score': result['score'],
                        'components': result['components'],
                    },
                )
                computed += 1
            except Exception as e:
                logger.exception(f"Health score computation failed for user {uid}: {e}")

    # Process solo users
    from django.contrib.auth import get_user_model
    User = get_user_model()
    coupled_ids = set()
    for couple in Couple.objects.filter(status=Couple.Status.ACTIVE):
        if couple.user1_id:
            coupled_ids.add(couple.user1_id)
        if couple.user2_id:
            coupled_ids.add(couple.user2_id)

    solo_users = User.objects.filter(is_active=True).exclude(id__in=coupled_ids)
    for user in solo_users:
        try:
            result = service.compute(user.id)
            DailyHealthScore.objects.update_or_create(
                user_id=user.id,
                date=today,
                defaults={
                    'score': result['score'],
                    'components': result['components'],
                },
            )
            computed += 1
        except Exception as e:
            logger.exception(f"Health score computation failed for solo user {user.id}: {e}")

    logger.info(f"Daily health score computation complete: {computed} scores computed")
