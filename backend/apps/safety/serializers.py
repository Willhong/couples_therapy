"""Serializers for safety API."""

from rest_framework import serializers
from .models import SafetyAssessment


class SafetyAssessmentSerializer(serializers.ModelSerializer):
    """Serializer for SafetyAssessment."""

    risk_level_display = serializers.CharField(
        source='get_risk_level_display',
        read_only=True
    )

    class Meta:
        model = SafetyAssessment
        fields = [
            'id',
            'risk_level',
            'risk_level_display',
            'assessment_data',
            'completed_at',
            'couple_features_enabled',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SafetyAssessmentCreateSerializer(serializers.Serializer):
    """Serializer for creating a safety assessment."""

    power_balance = serializers.IntegerField(min_value=1, max_value=5)
    fear = serializers.ChoiceField(choices=['yes', 'no'])
    control = serializers.ChoiceField(choices=['yes', 'no'])
    verbal_abuse = serializers.ChoiceField(choices=['yes', 'no'])
    physical_safety = serializers.ChoiceField(choices=['yes', 'no'])
