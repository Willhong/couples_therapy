"""Conversation context manager with rolling summarization.

Manages conversation history to fit within LLM context windows
using rolling summarization. Keeps recent messages verbatim
and summarizes older messages.
"""

import logging
from typing import Optional

from django.conf import settings
from langchain_core.messages import HumanMessage

from ..prompts.system_prompts import SUMMARIZATION_PROMPT
from .llm_service import get_summarization_model

logger = logging.getLogger(__name__)


class ConversationContextManager:
    """Manages conversation context using rolling summarization.

    Keeps recent messages verbatim + summarized older context.
    This allows "infinite" chat while staying within LLM context limits.
    """

    MAX_RECENT_MESSAGES = 10  # Keep last 10 messages verbatim
    SUMMARY_TRIGGER_COUNT = 20  # Summarize when exceeding this
    SUMMARY_STALE_THRESHOLD = 15  # Re-summarize if message count exceeds this past last summary

    def __init__(self, conversation_id: str):
        """Initialize context manager for a conversation.

        Args:
            conversation_id: UUID of the conversation
        """
        self.conversation_id = conversation_id
        self._cached_summary: Optional[str] = None

    def get_context_for_ai(self) -> str:
        """Get optimized context string for LLM API.

        Returns formatted context with:
        - Summary of older messages (if any)
        - Recent messages verbatim

        Returns:
            str: Formatted context for LLM prompt
        """
        from apps.chat.models import Message

        messages = Message.objects.filter(
            conversation_id=self.conversation_id
        ).order_by('-created_at')

        total_count = messages.count()

        if total_count == 0:
            return ""

        if total_count <= self.MAX_RECENT_MESSAGES:
            # Few messages: return all verbatim
            return self._format_messages(list(reversed(messages)))

        # Get recent messages verbatim
        recent_messages = list(messages[:self.MAX_RECENT_MESSAGES])
        recent_messages.reverse()

        # Get or create summary of older messages
        summary = self._get_or_create_summary()

        context_parts = []
        if summary:
            context_parts.append(f"[이전 대화 요약]\n{summary}\n")
        context_parts.append("[최근 대화]")
        context_parts.append(self._format_messages(recent_messages))

        return "\n".join(context_parts)

    def _get_or_create_summary(self) -> str:
        """Get cached summary or generate new one.

        Returns:
            str: Summary of older messages, or empty string if none needed
        """
        from apps.chat.models import Message, ConversationSummary

        # Check for existing valid summary
        existing = ConversationSummary.objects.filter(
            conversation_id=self.conversation_id
        ).order_by('-created_at').first()

        if existing and self._is_summary_current(existing):
            return existing.summary_text

        # Get older messages to summarize
        all_messages = Message.objects.filter(
            conversation_id=self.conversation_id
        ).order_by('created_at')

        total = all_messages.count()
        if total <= self.MAX_RECENT_MESSAGES:
            return ""

        older_messages = list(all_messages[:total - self.MAX_RECENT_MESSAGES])

        if not older_messages:
            return ""

        # Generate new summary
        summary_text = self._generate_summary(older_messages)

        # Save summary
        ConversationSummary.objects.create(
            conversation_id=self.conversation_id,
            summary_text=summary_text,
            message_count=len(older_messages)
        )

        logger.info(
            f"Created summary for conversation {self.conversation_id}: "
            f"{len(older_messages)} messages summarized"
        )

        return summary_text

    def _generate_summary(self, messages) -> str:
        """Use LLM to summarize older messages.

        Args:
            messages: List of Message objects to summarize

        Returns:
            str: Generated summary
        """
        formatted = self._format_messages(messages)

        model = get_summarization_model()

        prompt = SUMMARIZATION_PROMPT.format(conversation=formatted)
        response = model.invoke([HumanMessage(content=prompt)])

        return response.content.strip()

    def _format_messages(self, messages) -> str:
        """Format messages for LLM context.

        Args:
            messages: List of Message objects

        Returns:
            str: Formatted message string
        """
        lines = []
        for msg in messages:
            role = "나" if msg.role == 'user' else "AI"
            lines.append(f"{role}: {msg.content}")
        return "\n".join(lines)

    def _is_summary_current(self, summary) -> bool:
        """Check if summary is still valid.

        Summary is current if message count hasn't grown too much
        since the summary was created.

        Args:
            summary: ConversationSummary object

        Returns:
            bool: True if summary is current
        """
        from apps.chat.models import Message

        current_count = Message.objects.filter(
            conversation_id=self.conversation_id
        ).count()

        # Summary is current if message count hasn't grown too much
        # past the number of messages included in the summary + recent messages
        messages_since_summary = current_count - (summary.message_count + self.MAX_RECENT_MESSAGES)

        return messages_since_summary < self.SUMMARY_STALE_THRESHOLD

    def get_message_count(self) -> int:
        """Get total message count for the conversation.

        Returns:
            int: Number of messages
        """
        from apps.chat.models import Message

        return Message.objects.filter(
            conversation_id=self.conversation_id
        ).count()

    def needs_summarization(self) -> bool:
        """Check if conversation needs summarization.

        Returns:
            bool: True if message count exceeds trigger threshold
        """
        return self.get_message_count() > self.SUMMARY_TRIGGER_COUNT

    async def get_context_for_ai_async(self) -> str:
        """Async version of get_context_for_ai.

        Uses database_sync_to_async for Django ORM operations.

        Returns:
            str: Formatted context for LLM prompt
        """
        from channels.db import database_sync_to_async

        return await database_sync_to_async(self.get_context_for_ai)()
