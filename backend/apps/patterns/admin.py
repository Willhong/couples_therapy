"""Admin registrations for pattern models."""

from django.contrib import admin

from .models import Pattern, InsightSummary, WeeklySummary


@admin.register(Pattern)
class PatternAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'pattern_type', 'category', 'severity', 'created_at']
    list_filter = ['pattern_type', 'category', 'severity']
    search_fields = ['content', 'context_snippet']
    readonly_fields = ['id', 'created_at']


@admin.register(InsightSummary)
class InsightSummaryAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'user', 'escalation_score', 'created_at']
    list_filter = ['escalation_score']
    readonly_fields = ['id', 'created_at']


@admin.register(WeeklySummary)
class WeeklySummaryAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'period_start', 'period_end', 'session_count', 'escalation_trend', 'created_at']
    list_filter = ['escalation_trend']
    readonly_fields = ['id', 'created_at']
