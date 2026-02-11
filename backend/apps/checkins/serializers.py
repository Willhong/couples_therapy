"""Serializers for checkins API."""

from rest_framework import serializers
from .models import DailyCheckIn, Streak


class DailyCheckInSerializer(serializers.ModelSerializer):
    """Serializer for DailyCheckIn."""

    mood_display = serializers.CharField(source='get_mood_display', read_only=True)

    class Meta:
        model = DailyCheckIn
        fields = [
            'id',
            'mood',
            'mood_display',
            'note',
            'answers',
            'date',
            'created_at',
        ]


class StreakSerializer(serializers.ModelSerializer):
    """Serializer for Streak."""

    class Meta:
        model = Streak
        fields = [
            'current_streak',
            'longest_streak',
            'last_checkin_date',
        ]


class CheckInCreateSerializer(serializers.Serializer):
    """Serializer for creating a check-in."""

    mood = serializers.IntegerField(min_value=1, max_value=5)
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        trim_whitespace=True,
    )


class DetailedCheckInCreateSerializer(serializers.Serializer):
    """Serializer for creating a detailed check-in."""
    answers = serializers.ListField(
        child=serializers.CharField(max_length=1000),
        min_length=1,
        max_length=20,
    )
