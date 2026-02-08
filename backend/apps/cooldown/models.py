"""Cool-down timer model for conflict de-escalation."""

import uuid
from django.db import models
from django.conf import settings


class CoolDown(models.Model):
    """Cool-down session for taking a break during conflicts."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cooldown_sessions'
    )
    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.SET_NULL,
        related_name='cooldown_sessions',
        null=True, blank=True
    )
    duration_seconds = models.IntegerField(default=600)  # 10 minutes default
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'cooldown_sessions'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        status = "active" if self.is_active else "completed"
        return f"CoolDown {self.id} ({self.user.email}) - {status}"
