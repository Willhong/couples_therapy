from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom User model using email for authentication."""

    username = None  # Remove username field
    email = models.EmailField('email address', unique=True)

    # Disclaimer consent tracking (SAFE-04)
    disclaimer_accepted = models.BooleanField(default=False)
    disclaimer_accepted_at = models.DateTimeField(null=True, blank=True)
    disclaimer_version = models.CharField(max_length=10, blank=True)

    # Onboarding progress
    onboarding_completed = models.BooleanField(default=False)
    tutorial_completed = models.BooleanField(default=False)

    # Push notifications
    expo_push_token = models.CharField(max_length=255, blank=True, default='')

    # Profile display
    display_name = models.CharField(max_length=50, blank=True, default='')
    avatar_color = models.CharField(max_length=7, blank=True, default='#C4A092')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email


class NotificationPreferences(models.Model):
    """User notification preferences."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    push_enabled = models.BooleanField(default=True)
    daily_prompt_enabled = models.BooleanField(default=True)
    partner_activity_enabled = models.BooleanField(default=True)
    weekly_insights_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = 'notification_preferences'

    def __str__(self):
        return f"NotificationPreferences for {self.user.email}"
