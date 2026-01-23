"""Onboarding models for user profile and goals."""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class UserProfile(models.Model):
    """User's attachment style and communication preferences from onboarding questionnaire."""

    class ConflictStyle(models.TextChoices):
        AVOID = 'avoid', '회피형'
        CONFRONT = 'confront', '대립형'
        COLLABORATE = 'collaborate', '협력형'
        COMPROMISE = 'compromise', '타협형'

    class CommunicationFrequency(models.TextChoices):
        DAILY = 'daily', '매일'
        WEEKLY = 'weekly', '매주'
        RARELY = 'rarely', '가끔'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )

    # Attachment style (simplified ECR-R inspired, 1-5 scale)
    attachment_anxiety = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='불안 애착 수준 (1-5)'
    )
    attachment_avoidance = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='회피 애착 수준 (1-5)'
    )

    # Communication preferences
    conflict_style = models.CharField(
        max_length=20,
        choices=ConflictStyle.choices,
        help_text='갈등 대응 스타일'
    )
    communication_frequency = models.CharField(
        max_length=20,
        choices=CommunicationFrequency.choices,
        help_text='선호하는 대화 빈도'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profiles'

    def __str__(self):
        return f"Profile for {self.user.email}"


class UserGoals(models.Model):
    """User's relationship goals from onboarding questionnaire."""

    class PrimaryGoal(models.TextChoices):
        PREVENTION = 'prevention', '예방 (건강한 관계 유지)'
        IMPROVEMENT = 'improvement', '개선 (소통 향상)'
        CRISIS = 'crisis', '위기 대응 (갈등 해결)'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='goals'
    )

    primary_goal = models.CharField(
        max_length=20,
        choices=PrimaryGoal.choices,
        help_text='주요 목표'
    )

    # Focus areas - stored as JSON array, max 3 items
    focus_areas = models.JSONField(
        default=list,
        help_text='집중 영역 (최대 3개)'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_goals'

    def __str__(self):
        return f"Goals for {self.user.email}"
