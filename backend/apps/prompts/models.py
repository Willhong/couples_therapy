"""Models for daily conversation prompts."""

from django.db import models
from django.conf import settings


class DailyPrompt(models.Model):
    """Daily conversation prompt/question for couples."""

    CATEGORY_CHOICES = [
        ('daily', '일상'),
        ('dreams', '꿈/목표'),
        ('memories', '추억'),
        ('gratitude', '감사'),
        ('future', '미래'),
        ('deep', '깊은 대화'),
    ]

    DIFFICULTY_CHOICES = [
        (1, 'Easy'),
        (2, 'Medium'),
        (3, 'Deep'),
    ]

    text_ko = models.TextField(verbose_name='질문 (한국어)')
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        verbose_name='카테고리'
    )
    difficulty_level = models.IntegerField(
        default=1,
        choices=DIFFICULTY_CHOICES,
        verbose_name='난이도'
    )
    is_active = models.BooleanField(default=True, verbose_name='활성화')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일')

    class Meta:
        db_table = 'daily_prompts'
        ordering = ['category', 'id']
        verbose_name = '일일 프롬프트'
        verbose_name_plural = '일일 프롬프트'

    def __str__(self):
        return f"{self.get_category_display()}: {self.text_ko[:30]}..."


class DailyPromptAssignment(models.Model):
    """Which prompt is assigned to which couple on which date."""

    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.CASCADE,
        related_name='prompt_assignments',
        verbose_name='커플'
    )
    prompt = models.ForeignKey(
        DailyPrompt,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name='프롬프트'
    )
    assigned_date = models.DateField(verbose_name='할당일')

    class Meta:
        db_table = 'daily_prompt_assignments'
        unique_together = ['couple', 'assigned_date']
        ordering = ['-assigned_date']
        verbose_name = '프롬프트 할당'
        verbose_name_plural = '프롬프트 할당'

    def __str__(self):
        return f"{self.couple} - {self.assigned_date}"


class PromptResponse(models.Model):
    """A user's response to a daily prompt."""

    assignment = models.ForeignKey(
        DailyPromptAssignment,
        on_delete=models.CASCADE,
        related_name='responses',
        verbose_name='할당'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='prompt_responses',
        verbose_name='사용자'
    )
    response_text = models.TextField(verbose_name='답변')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일')

    class Meta:
        db_table = 'prompt_responses'
        unique_together = ['assignment', 'user']
        ordering = ['-created_at']
        verbose_name = '프롬프트 답변'
        verbose_name_plural = '프롬프트 답변'

    def __str__(self):
        return f"{self.user.email} - {self.assignment.assigned_date}"
