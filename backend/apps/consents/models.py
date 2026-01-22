"""Consent models for recording consent and disclaimer tracking."""

from django.db import models
from django.conf import settings
from django.utils import timezone
from fernet_fields.fields import EncryptedTextField


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
