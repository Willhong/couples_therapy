"""Insight delivery manager for chat agent (Task 5).

Handles checking for pending insights, offering them to the user
in conversation, and delivering them with permission.
"""

import logging

from django.utils import timezone

logger = logging.getLogger(__name__)


class InsightDeliveryManager:
    """Manages insight delivery within chat conversations."""

    @classmethod
    def check_pending_insights(cls, user_id: int) -> list[dict]:
        """Check for completed but undelivered insights.

        Args:
            user_id: User to check.

        Returns:
            List of insight summaries ready for delivery.
        """
        from apps.intelligence.models import InsightReport

        reports = InsightReport.objects.filter(
            user_id=user_id,
            status=InsightReport.Status.COMPLETED,
            in_conversation_delivered=False,
        ).order_by('-created_at')[:3]

        return [
            {
                'id': str(r.id),
                'title': r.report_title,
                'trigger_tier': r.trigger_tier,
                'key_insights_count': len(r.key_insights) if r.key_insights else 0,
                'created_at': r.created_at.isoformat(),
            }
            for r in reports
        ]

    @classmethod
    def prepare_insight_offer(cls, insight_summary: dict) -> str:
        """Generate Korean text asking permission to share insight.

        Args:
            insight_summary: Dict from check_pending_insights.

        Returns:
            Korean text for the chat agent to use.
        """
        title = insight_summary.get('title', '새로운 인사이트')
        count = insight_summary.get('key_insights_count', 0)

        return (
            f"새로운 분석 결과가 준비되었어요: \"{title}\"\n"
            f"{count}개의 주요 인사이트가 있습니다.\n"
            f"지금 확인해 보시겠어요?"
        )

    @classmethod
    def deliver_insight(cls, insight_id: str, conversation_context: dict | None = None) -> str:
        """Format and deliver an insight report as chat text.

        Args:
            insight_id: InsightReport UUID.
            conversation_context: Optional current conversation context.

        Returns:
            Formatted Korean text of the insight.
        """
        from apps.intelligence.models import InsightReport

        try:
            report = InsightReport.objects.get(pk=insight_id)
        except InsightReport.DoesNotExist:
            return "죄송합니다, 해당 인사이트를 찾을 수 없습니다."

        # Build formatted delivery text
        lines = [f"📊 {report.report_title}", ""]

        if report.report_summary:
            lines.append(report.report_summary)
            lines.append("")

        if report.key_insights:
            lines.append("💡 주요 인사이트:")
            for i, insight in enumerate(report.key_insights, 1):
                if isinstance(insight, str):
                    lines.append(f"  {i}. {insight}")
                elif isinstance(insight, dict):
                    lines.append(f"  {i}. {insight.get('text', '')}")
            lines.append("")

        if report.suggested_actions:
            lines.append("🎯 제안 행동:")
            for action in report.suggested_actions:
                if isinstance(action, str):
                    lines.append(f"  • {action}")
                elif isinstance(action, dict):
                    lines.append(f"  • {action.get('text', '')}")

        return "\n".join(lines)

    @classmethod
    def mark_delivered(cls, insight_id: str) -> bool:
        """Mark an insight as delivered in conversation.

        Args:
            insight_id: InsightReport UUID.

        Returns:
            True if successfully marked.
        """
        from apps.intelligence.models import InsightReport

        try:
            report = InsightReport.objects.get(pk=insight_id)
            report.in_conversation_delivered = True
            if not report.is_read:
                report.is_read = True
                report.read_at = timezone.now()
            report.save(update_fields=['in_conversation_delivered', 'is_read', 'read_at'])
            return True
        except InsightReport.DoesNotExist:
            return False
