"""Serializers for activities API."""

from rest_framework import serializers
from .models import Activity, CoupleActivity


class ActivitySerializer(serializers.ModelSerializer):
    """Serializer for Activity."""

    category_display = serializers.CharField(source='get_category_display', read_only=True)
    difficulty_display = serializers.CharField(source='get_difficulty_display', read_only=True)

    class Meta:
        model = Activity
        fields = [
            'id',
            'title',
            'description',
            'category',
            'category_display',
            'estimated_minutes',
            'difficulty',
            'difficulty_display',
            'is_featured',
        ]


class CoupleActivitySerializer(serializers.ModelSerializer):
    """Serializer for CoupleActivity."""

    activity = ActivitySerializer(read_only=True)

    class Meta:
        model = CoupleActivity
        fields = [
            'id',
            'activity',
            'status',
            'started_at',
            'completed_at',
            'rating',
            'created_at',
        ]
