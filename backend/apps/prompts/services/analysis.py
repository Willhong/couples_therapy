"""Prompt response analysis (F2).

Computes alignment scores when both partners respond to a prompt.
Identifies divergent vs aligned responses.
"""

import logging

logger = logging.getLogger(__name__)


class PromptAlignmentService:
    """Analyzes prompt response alignment between partners."""

    @classmethod
    def analyze_assignment(cls, assignment_id: int) -> dict | None:
        """Compute alignment for a prompt assignment where both partners responded.

        Args:
            assignment_id: DailyPromptAssignment ID.

        Returns:
            Dict with alignment_score, status, or None if not both responded.
        """
        from apps.prompts.models import DailyPromptAssignment

        try:
            assignment = DailyPromptAssignment.objects.prefetch_related(
                'responses',
            ).get(pk=assignment_id)
        except DailyPromptAssignment.DoesNotExist:
            return None

        responses = list(assignment.responses.all())
        if len(responses) < 2:
            return None

        r1 = responses[0].response_text
        r2 = responses[1].response_text

        # Compute simple alignment metrics
        alignment_score = cls._compute_text_similarity(r1, r2)

        if alignment_score >= 0.6:
            alignment_status = 'aligned'
        elif alignment_score >= 0.3:
            alignment_status = 'partially_aligned'
        else:
            alignment_status = 'divergent'

        return {
            'assignment_id': assignment_id,
            'alignment_score': round(alignment_score, 2),
            'status': alignment_status,
            'response_lengths': [len(r1), len(r2)],
        }

    @classmethod
    def get_couple_alignment_trend(cls, couple_id: int, days: int = 30) -> dict:
        """Get alignment trend for a couple over time.

        Args:
            couple_id: Couple to analyze.
            days: Lookback period.

        Returns:
            Dict with avg_alignment, trend, count.
        """
        from datetime import date, timedelta
        from apps.prompts.models import DailyPromptAssignment
        from django.db.models import Count

        cutoff = date.today() - timedelta(days=days)

        assignments = DailyPromptAssignment.objects.filter(
            couple_id=couple_id,
            assigned_date__gte=cutoff,
        ).annotate(
            response_count=Count('responses'),
        ).filter(response_count=2)

        scores = []
        for a in assignments:
            result = cls.analyze_assignment(a.id)
            if result:
                scores.append(result['alignment_score'])

        if not scores:
            return {
                'avg_alignment': None,
                'trend': 'insufficient_data',
                'count': 0,
            }

        avg = sum(scores) / len(scores)

        # Simple trend: compare first half to second half
        mid = len(scores) // 2
        if mid > 0:
            first_half = sum(scores[:mid]) / mid
            second_half = sum(scores[mid:]) / len(scores[mid:])
            if second_half > first_half + 0.1:
                trend = 'improving'
            elif second_half < first_half - 0.1:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'

        return {
            'avg_alignment': round(avg, 2),
            'trend': trend,
            'count': len(scores),
        }

    @classmethod
    def _compute_text_similarity(cls, text1: str, text2: str) -> float:
        """Compute simple token-overlap similarity (Jaccard).

        For production, consider using embedding-based similarity.
        """
        if not text1 or not text2:
            return 0.0

        # Simple word-level Jaccard similarity
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())

        if not words1 or not words2:
            return 0.0

        intersection = words1 & words2
        union = words1 | words2

        return len(intersection) / len(union) if union else 0.0
