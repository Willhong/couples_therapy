"""Serializers for intelligence API."""

from rest_framework import serializers
from .models import InsightReport


class InsightReportListSerializer(serializers.ModelSerializer):
    """List serializer (summary only, no encrypted fields)."""

    class Meta:
        model = InsightReport
        fields = [
            'id', 'trigger_tier', 'report_title', 'is_read',
            'status', 'created_at', 'data_period_start', 'data_period_end',
        ]


class InsightReportDetailSerializer(serializers.ModelSerializer):
    """Detail serializer with all report content."""

    class Meta:
        model = InsightReport
        fields = [
            'id', 'trigger_tier', 'trigger_reason',
            'data_period_start', 'data_period_end',
            'report_title', 'report_summary',
            'key_insights', 'suggested_actions', 'recommended_activities',
            'ethics_review',
            'is_read', 'read_at', 'in_conversation_delivered',
            'status', 'created_at',
        ]
        # Note: pattern_analysis, emotion_analysis, balance_analysis, resolution_suggestions
        # are intentionally excluded - internal analysis data, not user-facing


class PartnerDashboardSerializer(serializers.Serializer):
    """Serializer for partner dashboard data."""
    partner_display_name = serializers.CharField()
    partner_mood_trend = serializers.CharField(allow_null=True)
    partner_avg_mood_7d = serializers.FloatField(allow_null=True)
    shared_health_score = serializers.IntegerField(allow_null=True)
    shared_insights_count = serializers.IntegerField()
    recent_shared_activities = serializers.ListField(child=serializers.DictField())
    couple_streak = serializers.DictField(allow_null=True)
