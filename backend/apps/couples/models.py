"""Couple and InviteCode models for partner linking."""

import secrets
from datetime import timedelta

from django.db import models
from django.conf import settings
from django.utils import timezone


def generate_invite_code():
    """Generate 6-character alphanumeric code (excluding confusing chars)."""
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # No 0, O, 1, I
    return ''.join(secrets.choice(chars) for _ in range(6))


class Couple(models.Model):
    """Represents a linked couple relationship."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'
        DISCONNECTED = 'disconnected', 'Disconnected'

    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='couple_as_user1'
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='couple_as_user2',
        null=True, blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    connected_at = models.DateTimeField(null=True, blank=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'couples'
        constraints = [
            models.CheckConstraint(
                check=~models.Q(user1=models.F('user2')),
                name='cannot_couple_with_self'
            )
        ]

    def __str__(self):
        user2_email = self.user2.email if self.user2 else 'None'
        return f"{self.user1.email} + {user2_email} ({self.status})"

    def get_partner(self, user):
        """Get the partner of the given user in this couple."""
        if user == self.user1:
            return self.user2
        elif user == self.user2:
            return self.user1
        return None


class InviteCode(models.Model):
    """Partner invitation code with 24-hour expiration."""

    code = models.CharField(max_length=6, unique=True, default=generate_invite_code)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_invite_codes'
    )
    couple = models.ForeignKey(
        Couple,
        on_delete=models.CASCADE,
        related_name='invite_codes'
    )
    expires_at = models.DateTimeField()
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='used_invite_codes'
    )
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invite_codes'
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.code} by {self.creator.email}"

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        """Check if the invite code is still valid."""
        return (
            self.used_by is None and
            self.expires_at > timezone.now()
        )

    @classmethod
    def create_for_user(cls, user):
        """Create a new invite code for a user, creating couple if needed."""
        # Check if user already has an active couple
        existing_couple = Couple.objects.filter(
            models.Q(user1=user) | models.Q(user2=user),
            status=Couple.Status.ACTIVE
        ).first()

        if existing_couple:
            raise ValueError("이미 파트너와 연결되어 있습니다.")

        # Create or get pending couple
        couple, _ = Couple.objects.get_or_create(
            user1=user,
            status=Couple.Status.PENDING
        )

        # Invalidate any existing codes
        cls.objects.filter(creator=user, used_by__isnull=True).update(
            expires_at=timezone.now()
        )

        # Create new code
        return cls.objects.create(creator=user, couple=couple)
