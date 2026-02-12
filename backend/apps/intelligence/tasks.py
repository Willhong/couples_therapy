"""Celery tasks for intelligence analysis triggers and dispatch."""

import logging

from celery import shared_task
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

User = get_user_model()


@shared_task(name='apps.intelligence.tasks.evaluate_analysis_triggers')
def evaluate_analysis_triggers():
    """Periodic task: evaluate triggers for all active users."""
    from apps.intelligence.services.trigger_service import AnalysisTriggerService

    trigger_service = AnalysisTriggerService()
    active_users = User.objects.filter(is_active=True).values_list('id', flat=True)

    triggered_count = 0
    for user_id in active_users:
        try:
            result = trigger_service.evaluate(user_id)
            if result.should_trigger:
                triggered_count += 1
                dispatch_multi_agent_analysis.delay(
                    str(user_id),
                    result.tier.value,
                    result.reason,
                )
                logger.info(
                    "Analysis triggered for user %s: tier=%s reason=%s",
                    user_id, result.tier.value, result.reason,
                )
        except Exception:
            logger.exception("Error evaluating triggers for user %s", user_id)

    logger.info(
        "Trigger evaluation complete: %d/%d users triggered",
        triggered_count, active_users.count(),
    )


@shared_task(name='apps.intelligence.tasks.on_conversation_ended')
def on_conversation_ended(conversation_id, user_id):
    """Event-driven trigger when a conversation ends."""
    from apps.intelligence.services.trigger_service import AnalysisTriggerService

    trigger_service = AnalysisTriggerService()

    try:
        result = trigger_service.evaluate(user_id)
        if result.should_trigger:
            dispatch_multi_agent_analysis.delay(
                str(user_id),
                result.tier.value,
                result.reason,
            )
            logger.info(
                "Post-conversation analysis triggered for user %s (conv %s): tier=%s",
                user_id, conversation_id, result.tier.value,
            )
    except Exception:
        logger.exception(
            "Error in post-conversation trigger for user %s (conv %s)",
            user_id, conversation_id,
        )


@shared_task(name='apps.intelligence.tasks.on_checkin_submitted')
def on_checkin_submitted(user_id):
    """Event-driven trigger on check-in submission (only critical/threshold)."""
    from apps.intelligence.services.trigger_service import AnalysisTriggerService

    trigger_service = AnalysisTriggerService()

    try:
        result = trigger_service.evaluate(user_id)
        # Only dispatch for critical or threshold tiers on check-in events
        if result.should_trigger and result.tier.value in ('critical', 'threshold'):
            dispatch_multi_agent_analysis.delay(
                str(user_id),
                result.tier.value,
                result.reason,
            )
            logger.info(
                "Post-checkin analysis triggered for user %s: tier=%s",
                user_id, result.tier.value,
            )
    except Exception:
        logger.exception(
            "Error in post-checkin trigger for user %s", user_id,
        )


@shared_task(name='apps.intelligence.tasks.dispatch_multi_agent_analysis')
def dispatch_multi_agent_analysis(user_id, tier, reason):
    """Dispatch the multi-agent analysis graph for a user.

    Creates an InsightReport in 'pending' status and kicks off
    the LangGraph analysis pipeline.
    """
    from datetime import timedelta

    from django.utils import timezone

    from apps.intelligence.models import InsightReport

    now = timezone.now()
    lookback = 14 if tier != 'critical' else 7

    # Create the pending report
    report = InsightReport.objects.create(
        user_id=user_id,
        trigger_tier=tier,
        trigger_reason=reason,
        data_period_start=(now - timedelta(days=lookback)).date(),
        data_period_end=now.date(),
        report_title='',
        report_summary='',
        status='processing',
    )

    logger.info(
        "Created InsightReport %s for user %s (tier=%s). Starting analysis pipeline.",
        report.id, user_id, tier,
    )

    # Get couple_id if available
    couple_id = None
    try:
        from apps.couples.models import Couple
        from django.db.models import Q
        couple = Couple.objects.filter(
            Q(user1_id=user_id) | Q(user2_id=user_id),
            status='active',
        ).first()
        if couple:
            couple_id = couple.id
            report.couple = couple
            report.save(update_fields=['couple'])
    except Exception:
        logger.warning("Could not determine couple for user %s", user_id)

    # Run the synchronous analysis pipeline
    from apps.intelligence.services.analysis_graph import run_analysis
    try:
        run_analysis(
            report_id=str(report.id),
            user_id=str(user_id),
            couple_id=couple_id,
            trigger_tier=tier,
            trigger_reason=reason,
            lookback_days=lookback,
        )
    except Exception:
        logger.exception("Analysis pipeline failed for report %s", report.id)

    return str(report.id)
