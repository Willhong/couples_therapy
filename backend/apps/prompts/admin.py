"""Admin interface for prompts."""

from django.contrib import admin
from .models import DailyPrompt, DailyPromptAssignment, PromptResponse


@admin.register(DailyPrompt)
class DailyPromptAdmin(admin.ModelAdmin):
    list_display = ['id', 'text_ko_short', 'category', 'difficulty_level', 'is_active', 'created_at']
    list_filter = ['category', 'difficulty_level', 'is_active']
    search_fields = ['text_ko']

    def text_ko_short(self, obj):
        return obj.text_ko[:50] + '...' if len(obj.text_ko) > 50 else obj.text_ko
    text_ko_short.short_description = '질문'


@admin.register(DailyPromptAssignment)
class DailyPromptAssignmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'couple', 'prompt', 'assigned_date', 'response_count']
    list_filter = ['assigned_date']
    raw_id_fields = ['couple', 'prompt']

    def response_count(self, obj):
        return obj.responses.count()
    response_count.short_description = '답변 수'


@admin.register(PromptResponse)
class PromptResponseAdmin(admin.ModelAdmin):
    list_display = ['id', 'assignment', 'user', 'created_at']
    list_filter = ['created_at']
    raw_id_fields = ['assignment', 'user']
