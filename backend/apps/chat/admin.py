"""Admin configuration for chat models."""

from django.contrib import admin
from .models import Conversation, Message, ConversationSummary, SharedReframing


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    """Admin for Conversation model."""

    list_display = ['id', 'user', 'couple', 'title', 'is_active', 'created_at', 'updated_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['user__email', 'title']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['user', 'couple']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    """Admin for Message model."""

    list_display = ['id', 'conversation', 'role', 'has_reframing', 'created_at']
    list_filter = ['role', 'has_reframing', 'created_at']
    search_fields = ['conversation__user__email']
    readonly_fields = ['id', 'created_at']
    raw_id_fields = ['conversation']


@admin.register(ConversationSummary)
class ConversationSummaryAdmin(admin.ModelAdmin):
    """Admin for ConversationSummary model."""

    list_display = ['id', 'conversation', 'message_count', 'created_at']
    list_filter = ['created_at']
    readonly_fields = ['id', 'created_at']
    raw_id_fields = ['conversation']


@admin.register(SharedReframing)
class SharedReframingAdmin(admin.ModelAdmin):
    """Admin for SharedReframing model."""

    list_display = ['id', 'message', 'shared_by', 'shared_with', 'privacy_level', 'shared_at']
    list_filter = ['privacy_level', 'shared_at']
    search_fields = ['shared_by__email', 'shared_with__email']
    readonly_fields = ['id', 'shared_at']
    raw_id_fields = ['message', 'shared_by', 'shared_with']
