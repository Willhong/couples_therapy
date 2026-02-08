"""Admin configuration for safety app."""

from django.contrib import admin
from .models import SafetyAssessment


@admin.register(SafetyAssessment)
class SafetyAssessmentAdmin(admin.ModelAdmin):
    """Admin interface for SafetyAssessment."""

    list_display = [
        'user',
        'risk_level',
        'couple_features_enabled',
        'completed_at',
        'created_at',
    ]
    list_filter = ['risk_level', 'couple_features_enabled', 'completed_at']
    search_fields = ['user__email']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
