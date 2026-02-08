"""Models for safety assessment and abuse screening."""

from django.db import models
from django.conf import settings


class SafetyAssessment(models.Model):
    """Safety assessment for relationship abuse screening."""

    RISK_LEVEL_CHOICES = [
        ('low', 'Low Risk'),
        ('moderate', 'Moderate Risk'),
        ('high', 'High Risk'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='safety_assessment',
        verbose_name='사용자'
    )
    risk_level = models.CharField(
        max_length=20,
        choices=RISK_LEVEL_CHOICES,
        default='low',
        verbose_name='위험 수준'
    )
    assessment_data = models.JSONField(
        default=dict,
        verbose_name='평가 데이터'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='완료일'
    )
    couple_features_enabled = models.BooleanField(
        default=True,
        verbose_name='커플 기능 활성화'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='수정일'
    )

    class Meta:
        db_table = 'safety_assessments'
        verbose_name = '안전 평가'
        verbose_name_plural = '안전 평가'

    def __str__(self):
        return f"{self.user.email} - {self.get_risk_level_display()}"
