"""Intelligence models for therapy insight reports."""

import uuid

from django.conf import settings
from django.db import models
from fernet_fields.fields import EncryptedTextField


class InsightReport(models.Model):
    """AI-generated therapy insight report."""

    class TriggerTier(models.TextChoices):
        CRITICAL = 'critical', 'Critical'
        THRESHOLD = 'threshold', 'Threshold'
        SUFFICIENCY = 'sufficiency', 'Sufficiency'
        PERIODIC = 'periodic', 'Periodic'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='insight_reports',
    )
    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.CASCADE,
        related_name='insight_reports',
        null=True, blank=True,
    )

    # Trigger metadata
    trigger_tier = models.CharField(
        max_length=20,
        choices=TriggerTier.choices,
    )
    trigger_reason = models.TextField()
    data_period_start = models.DateField()
    data_period_end = models.DateField()

    # Analysis sections (encrypted)
    pattern_analysis = EncryptedTextField(null=True, blank=True)
    emotion_analysis = EncryptedTextField(null=True, blank=True)
    balance_analysis = EncryptedTextField(null=True, blank=True)
    resolution_suggestions = EncryptedTextField(null=True, blank=True)

    # Ethics
    ethics_review = models.JSONField(default=dict)

    # Report content
    report_title = models.CharField(max_length=200)
    report_summary = EncryptedTextField()
    key_insights = models.JSONField(default=list)
    suggested_actions = models.JSONField(default=list)
    recommended_activities = models.JSONField(default=list)

    # Delivery tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    in_conversation_delivered = models.BooleanField(default=False)

    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'insight_reports'
        ordering = ['-created_at']

    def __str__(self):
        return f"InsightReport {self.id} ({self.trigger_tier}) - {self.report_title[:50]}"
