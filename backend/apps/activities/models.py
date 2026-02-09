"""Models for couple activities and exercises."""

from django.db import models


class Activity(models.Model):
    """Activity or exercise for couples."""

    CATEGORY_CHOICES = [
        ('conversation', '대화'),
        ('game', '게임'),
        ('exercise', '운동'),
        ('date', '데이트'),
    ]

    DIFFICULTY_CHOICES = [
        (1, '쉬움'),
        (2, '보통'),
        (3, '도전'),
    ]

    title = models.CharField(max_length=100, verbose_name='제목')
    description = models.TextField(verbose_name='설명')
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        verbose_name='카테고리'
    )
    estimated_minutes = models.IntegerField(default=15, verbose_name='예상 시간(분)')
    difficulty = models.IntegerField(
        choices=DIFFICULTY_CHOICES,
        verbose_name='난이도'
    )
    is_featured = models.BooleanField(default=False, verbose_name='추천')
    is_active = models.BooleanField(default=True, verbose_name='활성화')
    order = models.IntegerField(default=0, verbose_name='순서')

    class Meta:
        db_table = 'activities'
        ordering = ['order', 'id']
        verbose_name = '활동'
        verbose_name_plural = '활동'

    def __str__(self):
        return f"{self.get_category_display()}: {self.title}"


class CoupleActivity(models.Model):
    """Activity instance for a couple."""

    STATUS_CHOICES = [
        ('pending', '대기'),
        ('in_progress', '진행중'),
        ('completed', '완료'),
    ]

    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.CASCADE,
        related_name='activities',
        verbose_name='커플'
    )
    activity = models.ForeignKey(
        Activity,
        on_delete=models.CASCADE,
        related_name='couple_activities',
        verbose_name='활동'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='상태'
    )
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='시작일'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='완료일'
    )
    rating = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='평점'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일')

    class Meta:
        db_table = 'couple_activities'
        ordering = ['-created_at']
        verbose_name = '커플 활동'
        verbose_name_plural = '커플 활동'

    def __str__(self):
        return f"{self.couple} - {self.activity.title}"
