"""Admin configuration for onboarding models."""

from django.contrib import admin
from .models import UserProfile, UserGoals


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin for UserProfile model."""

    list_display = [
        'user',
        'attachment_anxiety',
        'attachment_avoidance',
        'conflict_style',
        'communication_frequency',
        'created_at',
    ]
    list_filter = ['conflict_style', 'communication_frequency']
    search_fields = ['user__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(UserGoals)
class UserGoalsAdmin(admin.ModelAdmin):
    """Admin for UserGoals model."""

    list_display = ['user', 'primary_goal', 'created_at']
    list_filter = ['primary_goal']
    search_fields = ['user__email']
    readonly_fields = ['created_at', 'updated_at']
