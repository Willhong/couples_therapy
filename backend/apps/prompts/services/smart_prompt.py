"""Smart daily prompt selection (D3).

Selects prompts based on recurring topics, mood trend,
and communication frequency. Never repeats within 30 days.
Logs selection reason.
"""

import logging
from datetime import date, timedelta

from django.db.models import Q

logger = logging.getLogger(__name__)

# Category mapping from pattern topics to prompt categories
TOPIC_TO_PROMPT_CATEGORY = {
    'finance': 'deep',
    'household': 'daily',
    'communication': 'deep',
    'family': 'memories',
    'parenting': 'future',
    'time': 'daily',
    'intimacy': 'deep',
}

# Mood-based category preferences
MOOD_CATEGORIES = {
    'low': ['gratitude', 'memories'],    # mood avg < 2.5
    'neutral': ['daily', 'dreams'],       # mood avg 2.5-3.5
    'high': ['deep', 'future'],           # mood avg > 3.5
}


class SmartPromptService:
    """Selects personalized daily prompts."""

    @classmethod
    def select_prompt(cls, couple_id: int, user_id: int) -> dict | None:
        """Select the best prompt for today.

        Args:
            couple_id: Couple to select for.
            user_id: Primary user (for context).

        Returns:
            Dict with prompt_id, reason, or None if no prompts available.
        """
        from apps.prompts.models import DailyPrompt, DailyPromptAssignment
        from apps.core.services.user_intelligence import UserIntelligenceService

        today = date.today()

        # Check if already assigned
        existing = DailyPromptAssignment.objects.filter(
            couple_id=couple_id,
            assigned_date=today,
        ).first()
        if existing:
            return {
                'prompt_id': existing.prompt_id,
                'reason': 'already_assigned',
            }

        # Get user context
        ctx = UserIntelligenceService.get_ai_context(user_id)

        # Get recently used prompt IDs (30 days)
        recent_ids = set(
            DailyPromptAssignment.objects.filter(
                couple_id=couple_id,
                assigned_date__gte=today - timedelta(days=30),
            ).values_list('prompt_id', flat=True)
        )

        # Available prompts (not recently used)
        available = DailyPrompt.objects.filter(is_active=True).exclude(id__in=recent_ids)
        if not available.exists():
            # Fallback: all active prompts
            available = DailyPrompt.objects.filter(is_active=True)
            if not available.exists():
                return None

        # Strategy 1: Match recurring topics
        prompt, reason = cls._match_by_topics(available, ctx)
        if prompt:
            cls._log_selection(couple_id, prompt, reason)
            return {'prompt_id': prompt.id, 'reason': reason}

        # Strategy 2: Match by mood trend
        prompt, reason = cls._match_by_mood(available, ctx)
        if prompt:
            cls._log_selection(couple_id, prompt, reason)
            return {'prompt_id': prompt.id, 'reason': reason}

        # Strategy 3: Communication frequency gating (difficulty)
        prompt, reason = cls._match_by_frequency(available, ctx)
        if prompt:
            cls._log_selection(couple_id, prompt, reason)
            return {'prompt_id': prompt.id, 'reason': reason}

        # Fallback: random
        prompt = available.order_by('?').first()
        reason = 'random_fallback'
        cls._log_selection(couple_id, prompt, reason)
        return {'prompt_id': prompt.id, 'reason': reason}

    @classmethod
    def _match_by_topics(cls, available, ctx) -> tuple:
        """Match prompts to user's recurring topics."""
        patterns = ctx.get('recent_patterns', {})
        top_topics = patterns.get('top_topics', [])

        if not top_topics:
            return None, ''

        # Map pattern topics to prompt categories
        categories = set()
        for t in top_topics[:3]:
            topic = t.get('topic', '')
            cat = TOPIC_TO_PROMPT_CATEGORY.get(topic)
            if cat:
                categories.add(cat)

        if not categories:
            return None, ''

        prompt = available.filter(category__in=categories).order_by('?').first()
        if prompt:
            return prompt, f'topic_match:{",".join(categories)}'

        return None, ''

    @classmethod
    def _match_by_mood(cls, available, ctx) -> tuple:
        """Match prompts based on mood trend."""
        # Determine mood level from attachment/pattern context
        # Simple heuristic: check if patterns suggest mood issues
        patterns = ctx.get('recent_patterns', {})
        avg_escalation = patterns.get('avg_escalation_score')

        if avg_escalation is not None:
            if avg_escalation > 6:
                mood_level = 'low'
            elif avg_escalation < 3:
                mood_level = 'high'
            else:
                mood_level = 'neutral'
        else:
            mood_level = 'neutral'

        categories = MOOD_CATEGORIES.get(mood_level, ['daily'])
        prompt = available.filter(category__in=categories).order_by('?').first()
        if prompt:
            return prompt, f'mood_match:{mood_level}'

        return None, ''

    @classmethod
    def _match_by_frequency(cls, available, ctx) -> tuple:
        """Match prompt difficulty to communication frequency."""
        comm_freq = ctx.get('communication_frequency') or 'weekly'

        if comm_freq == 'rarely':
            max_difficulty = 1
        elif comm_freq == 'weekly':
            max_difficulty = 2
        else:
            max_difficulty = 3

        prompt = available.filter(
            difficulty_level__lte=max_difficulty,
        ).order_by('?').first()
        if prompt:
            return prompt, f'frequency_match:{comm_freq}'

        return None, ''

    @classmethod
    def _log_selection(cls, couple_id, prompt, reason):
        logger.info(
            'SmartPrompt selected: couple=%s prompt=%s reason=%s',
            couple_id, prompt.id if prompt else None, reason,
        )
