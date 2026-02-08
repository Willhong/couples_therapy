"""Admin configuration for cooldown app."""

from django.contrib import admin
from .models import CoolDown


@admin.register(CoolDown)
class CoolDownAdmin(admin.ModelAdmin):
    """Admin interface for CoolDown sessions."""

    list_display = ['id', 'user', 'duration_seconds', 'started_at', 'is_active']
    list_filter = ['is_active', 'started_at']
    search_fields = ['user__email', 'id']
    readonly_fields = ['id', 'started_at', 'completed_at']
    ordering = ['-started_at']
