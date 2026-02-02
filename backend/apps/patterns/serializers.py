"""Serializers for pattern models."""

from rest_framework import serializers

from .models import Pattern, InsightSummary, WeeklySummary


class PatternSerializer(serializers.ModelSerializer):
    """Serializer for Pattern model."""

    conversation_id = serializers.UUIDField(source='conversation.id', read_only=True)

    class Meta:
        model = Pattern
        fields = [
            'id', 'pattern_type', 'content', 'category',
            'severity', 'context_snippet', 'conversation_id', 'created_at',
        ]
        read_only_fields = fields


class InsightSummarySerializer(serializers.ModelSerializer):
    """Serializer for InsightSummary model."""

    conversation_id = serializers.UUIDField(source='conversation.id', read_only=True)

    class Meta:
        model = InsightSummary
        fields = [
            'id', 'conversation_id', 'trigger_phrases', 'recurring_topics',
            'escalation_score', 'ai_summary', 'created_at',
        ]
        read_only_fields = fields


class WeeklySummarySerializer(serializers.ModelSerializer):
    """Serializer for WeeklySummary model."""

    class Meta:
        model = WeeklySummary
        fields = [
            'id', 'period_start', 'period_end', 'session_count',
            'top_topics', 'trigger_frequency', 'trend_text',
            'escalation_trend', 'created_at',
        ]
        read_only_fields = fields


class PatternStatsSerializer(serializers.Serializer):
    """Serializer for aggregated pattern statistics (dashboard)."""

    total_sessions = serializers.IntegerField()
    trigger_phrase_count = serializers.IntegerField()
    recurring_topic_count = serializers.IntegerField()
    avg_escalation = serializers.FloatField()
    top_categories = serializers.ListField(child=serializers.DictField())
    top_triggers = serializers.ListField(child=serializers.DictField())
    escalation_by_week = serializers.ListField(child=serializers.DictField())
    sessions_by_week = serializers.ListField(child=serializers.DictField())
