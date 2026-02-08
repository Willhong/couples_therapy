"""Serializers for prompts API."""

from rest_framework import serializers
from .models import DailyPrompt, DailyPromptAssignment, PromptResponse


class DailyPromptSerializer(serializers.ModelSerializer):
    """Serializer for DailyPrompt."""

    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = DailyPrompt
        fields = [
            'id',
            'text_ko',
            'category',
            'category_display',
            'difficulty_level',
        ]


class PromptResponseSerializer(serializers.ModelSerializer):
    """Serializer for PromptResponse."""

    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = PromptResponse
        fields = [
            'id',
            'user',
            'user_email',
            'response_text',
            'created_at',
        ]
        read_only_fields = ['id', 'user', 'created_at']


class DailyPromptAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for DailyPromptAssignment with responses."""

    prompt = DailyPromptSerializer(read_only=True)
    responses = PromptResponseSerializer(many=True, read_only=True)
    response_count = serializers.SerializerMethodField()
    both_responded = serializers.SerializerMethodField()

    class Meta:
        model = DailyPromptAssignment
        fields = [
            'id',
            'assigned_date',
            'prompt',
            'responses',
            'response_count',
            'both_responded',
        ]

    def get_response_count(self, obj):
        return obj.responses.count()

    def get_both_responded(self, obj):
        return obj.responses.count() >= 2


class PromptResponseCreateSerializer(serializers.Serializer):
    """Serializer for creating a prompt response."""

    response_text = serializers.CharField(
        max_length=500,
        min_length=1,
        trim_whitespace=True,
    )
