"""Serializers for intelligence API."""

from rest_framework import serializers
from .models import InsightReport


def _truncate_text(value: str, max_length: int = 180) -> str:
    """Return a truncated preview string."""
    value = (value or "").strip()
    if len(value) <= max_length:
        return value
    return f"{value[:max_length].rstrip()}..."


class InsightReportListSerializer(serializers.ModelSerializer):
    """List serializer (summary only, no encrypted fields)."""

    title = serializers.SerializerMethodField()
    report_title = serializers.SerializerMethodField()
    report_type = serializers.SerializerMethodField()
    preview = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)

    class Meta:
        model = InsightReport
        fields = [
            'id',
            'title',
            'report_title',
            'report_type',
            'preview',
            'trigger_tier',
            'is_read',
            'status',
            'created_at',
            'data_period_start',
            'data_period_end',
        ]

    def get_title(self, obj: InsightReport) -> str:
        return obj.report_title

    def get_report_title(self, obj: InsightReport) -> str:
        return obj.report_title

    def get_report_type(self, obj: InsightReport) -> str:
        return obj.trigger_tier or 'accumulative'

    def get_preview(self, obj: InsightReport) -> str:
        return _truncate_text(obj.report_summary or obj.report_title)


class InsightReportDetailSerializer(serializers.ModelSerializer):
    """Detail serializer with all report content."""

    title = serializers.SerializerMethodField()
    report_title = serializers.SerializerMethodField()
    full_text = serializers.SerializerMethodField()
    report_type = serializers.SerializerMethodField()
    insights = serializers.SerializerMethodField()
    recommended_actions = serializers.SerializerMethodField()
    preview = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)

    class Meta:
        model = InsightReport
        fields = [
            'id', 'trigger_tier', 'trigger_reason',
            'data_period_start', 'data_period_end',
            'title', 'report_type',
            'report_title',
            'preview',
            'full_text', 'insights', 'recommended_actions',
            'report_summary', 'key_insights',
            'suggested_actions', 'recommended_activities',
            'ethics_review',
            'is_read', 'read_at', 'in_conversation_delivered',
            'status', 'created_at',
        ]
        # Note: pattern_analysis, emotion_analysis, balance_analysis, resolution_suggestions
        # are intentionally excluded - internal analysis data, not user-facing

    def get_title(self, obj: InsightReport) -> str:
        return obj.report_title

    def get_report_title(self, obj: InsightReport) -> str:
        return obj.report_title

    def get_report_type(self, obj: InsightReport) -> str:
        return obj.trigger_tier or 'accumulative'

    def get_preview(self, obj: InsightReport) -> str:
        return _truncate_text(obj.report_summary or obj.report_title)

    def get_full_text(self, obj: InsightReport) -> str:
        return obj.report_summary

    def get_insights(self, obj: InsightReport) -> list:
        return list(obj.key_insights or [])

    def get_recommended_actions(self, obj: InsightReport) -> list:
        return list(obj.suggested_actions or [])


class PartnerDashboardSerializer(serializers.Serializer):
    """Serializer for partner dashboard data."""
    partner_display_name = serializers.CharField()
    partner_mood_trend = serializers.CharField(allow_null=True)
    partner_avg_mood_7d = serializers.FloatField(allow_null=True)
    shared_health_score = serializers.IntegerField(allow_null=True)
    shared_insights_count = serializers.IntegerField()
    recent_shared_activities = serializers.ListField(child=serializers.DictField())
    couple_streak = serializers.DictField(allow_null=True)
