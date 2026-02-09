"""Models for daily mood check-ins and streaks."""

from django.db import models
from django.conf import settings


class DailyCheckIn(models.Model):
    """Daily mood check-in for a user."""

    MOOD_CHOICES = [
        (1, '매우 나쁨'),
        (2, '나쁨'),
        (3, '보통'),
        (4, '좋음'),
        (5, '매우 좋음'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='checkins',
        verbose_name='사용자'
    )
    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.CASCADE,
        related_name='checkins',
        verbose_name='커플'
    )
    mood = models.IntegerField(
        choices=MOOD_CHOICES,
        verbose_name='기분'
    )
    note = models.TextField(
        blank=True,
        default='',
        verbose_name='메모'
    )
    date = models.DateField(verbose_name='날짜')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일')

    class Meta:
        db_table = 'daily_checkins'
        unique_together = ['user', 'date']
        ordering = ['-date']
        verbose_name = '일일 체크인'
        verbose_name_plural = '일일 체크인'

    def __str__(self):
        return f"{self.user.email} - {self.date}"


class Streak(models.Model):
    """User's check-in streak tracking."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='streak',
        verbose_name='사용자'
    )
    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.CASCADE,
        related_name='streaks',
        verbose_name='커플'
    )
    current_streak = models.IntegerField(default=0, verbose_name='현재 연속')
    longest_streak = models.IntegerField(default=0, verbose_name='최장 연속')
    last_checkin_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='마지막 체크인'
    )

    class Meta:
        db_table = 'streaks'
        verbose_name = '연속 기록'
        verbose_name_plural = '연속 기록'

    def __str__(self):
        return f"{self.user.email} - {self.current_streak}일"
