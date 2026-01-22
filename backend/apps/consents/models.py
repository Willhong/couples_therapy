"""Consent models for recording consent and disclaimer tracking."""

import uuid
from datetime import timedelta

from django.db import models
from django.conf import settings
from django.utils import timezone
from fernet_fields.fields import EncryptedTextField


class RecordingConsent(models.Model):
    """Tracks dual consent for recording sessions (SAFE-01)."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        BOTH_CONSENTED = 'both_consented', 'Both Consented'
        DECLINED = 'declined', 'Declined'
        EXPIRED = 'expired', 'Expired'

    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.CASCADE,
        related_name='recording_consents'
    )
    session_id = models.UUIDField(unique=True, default=uuid.uuid4)

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consent_requests_made'
    )
    requester_consented = models.BooleanField(default=True)
    requester_consented_at = models.DateTimeField(auto_now_add=True)

    responder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consent_requests_received',
        null=True
    )
    responder_consented = models.BooleanField(null=True)
    responder_consented_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    # IP addresses encrypted for privacy (audit trail)
    requester_ip = EncryptedTextField(blank=True, null=True)
    responder_ip = EncryptedTextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'recording_consents'
        ordering = ['-created_at']

    def __str__(self):
        return f"Consent {self.session_id} - {self.status}"

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=5)
        super().save(*args, **kwargs)

    def process_response(self, user, consented: bool, ip_address: str = None):
        """Process consent response from partner."""
        if user != self.responder:
            raise ValueError("Only responder can respond to consent")

        self.responder_consented = consented
        self.responder_consented_at = timezone.now()
        self.responder_ip = ip_address

        if consented and self.requester_consented:
            self.status = self.Status.BOTH_CONSENTED
        else:
            self.status = self.Status.DECLINED

        self.save()
        return self.status


class DisclaimerConsent(models.Model):
    """Tracks disclaimer acknowledgment (SAFE-04)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='disclaimer_consents'
    )
    version = models.CharField(max_length=10)  # e.g., "1.0", "1.1"
    content_hash = models.CharField(max_length=64)  # SHA-256 of disclaimer text
    consented_at = models.DateTimeField(auto_now_add=True)
    ip_address = EncryptedTextField(blank=True, null=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = 'disclaimer_consents'
        unique_together = ['user', 'version']

    def __str__(self):
        return f"{self.user.email} - v{self.version}"
