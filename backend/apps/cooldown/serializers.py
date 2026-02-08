"""Serializers for cool-down API."""

from rest_framework import serializers
from .models import CoolDown


class CoolDownSerializer(serializers.ModelSerializer):
    """Serializer for CoolDown sessions."""

    class Meta:
        model = CoolDown
        fields = [
            'id',
            'duration_seconds',
            'started_at',
            'completed_at',
            'is_active',
        ]
        read_only_fields = ['id', 'started_at', 'completed_at', 'is_active']


class CoolDownStartSerializer(serializers.Serializer):
    """Serializer for starting a cool-down session."""

    duration_seconds = serializers.IntegerField(
        min_value=300,  # 5 minutes minimum
        max_value=1800,  # 30 minutes maximum
        default=600,  # 10 minutes default
    )
