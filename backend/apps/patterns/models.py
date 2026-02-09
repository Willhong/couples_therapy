"""Pattern detection models.

Pattern stores individual detected patterns (triggers, topics, escalation).
InsightSummary stores per-session AI-generated insights.
WeeklySummary stores weekly aggregated pattern summaries.
"""

import uuid

from django.conf import settings
from django.db import models
from fernet_fields.fields import EncryptedTextField


class Pattern(models.Model):
    """An individual detected communication pattern."""

    class PatternType(models.TextChoices):
        TRIGGER_PHRASE = 'trigger_phrase', 'Trigger Phrase'
        RECURRING_TOPIC = 'recurring_topic', 'Recurring Topic'
        ESCALATION = 'escalation', 'Escalation'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patterns',
    )
    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.CASCADE,
        related_name='patterns',
        null=True, blank=True,
    )
    conversation = models.ForeignKey(
        'chat.Conversation',
        on_delete=models.CASCADE,
        related_name='patterns',
    )
    pattern_type = models.CharField(
        max_length=20,
        choices=PatternType.choices,
    )
    content = models.TextField(
        help_text='The detected pattern text, e.g. "넌 항상 늦어"',
    )
    category = models.CharField(
        max_length=50,
        null=True, blank=True,
        help_text='Topic category: finance, time, household, communication, family, parenting, etc.',
    )
    severity = models.IntegerField(
        default=1,
        help_text='Severity/frequency score 1-5',
    )
    context_snippet = models.TextField(
        blank=True, default='',
        help_text='Surrounding text for context',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'patterns'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'pattern_type']),
            models.Index(fields=['couple', '-created_at']),
            models.Index(fields=['conversation']),
        ]

    def __str__(self):
        return f"Pattern({self.pattern_type}): {self.content[:50]}"


class InsightSummary(models.Model):
    """Per-session AI-generated insight summary."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.OneToOneField(
        'chat.Conversation',
        on_delete=models.CASCADE,
        related_name='insight_summary',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='insight_summaries',
    )
    trigger_phrases = models.JSONField(
        default=list,
        help_text='List of detected trigger phrases with context',
    )
    recurring_topics = models.JSONField(
        default=list,
        help_text='List of topic matches with prior sessions',
    )
    escalation_score = models.IntegerField(
        default=0,
        help_text='Escalation score 0-10',
    )
    ai_summary = EncryptedTextField(
        null=True, blank=True,
        help_text='AI-generated insight text',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'insight_summaries'
        ordering = ['-created_at']

    def __str__(self):
        return f"InsightSummary for conversation {self.conversation_id}"


class WeeklySummary(models.Model):
    """Weekly aggregated pattern summary."""

    class EscalationTrend(models.TextChoices):
        IMPROVING = 'improving', 'Improving'
        STABLE = 'stable', 'Stable'
        WORSENING = 'worsening', 'Worsening'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='weekly_summaries',
    )
    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.CASCADE,
        related_name='weekly_summaries',
        null=True, blank=True,
    )
    period_start = models.DateField()
    period_end = models.DateField()
    session_count = models.IntegerField(default=0)
    top_topics = models.JSONField(
        default=list,
        help_text='List of {topic, count} dicts',
    )
    trigger_frequency = models.JSONField(
        default=dict,
        help_text='{phrase: count} dict',
    )
    trend_text = EncryptedTextField(
        null=True, blank=True,
        help_text='AI-generated trend description',
    )
    escalation_trend = models.CharField(
        max_length=20,
        choices=EscalationTrend.choices,
        default=EscalationTrend.STABLE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'weekly_summaries'
        ordering = ['-period_end']

    def __str__(self):
        return f"WeeklySummary {self.period_start} ~ {self.period_end} for {self.user_id}"
