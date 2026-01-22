"""Serializers for consent endpoints."""

from rest_framework import serializers

from .models import RecordingConsent, DisclaimerConsent


class RecordingConsentSerializer(serializers.ModelSerializer):
    """Serializer for recording consent."""

    class Meta:
        model = RecordingConsent
        fields = [
            'id',
            'session_id',
            'requester',
            'responder',
            'requester_consented',
            'responder_consented',
            'status',
            'created_at',
            'expires_at',
        ]
        read_only_fields = [
            'id',
            'session_id',
            'requester',
            'responder',
            'requester_consented',
            'responder_consented',
            'status',
            'created_at',
            'expires_at',
        ]


class DisclaimerConsentSerializer(serializers.ModelSerializer):
    """Serializer for disclaimer consent records."""

    class Meta:
        model = DisclaimerConsent
        fields = ['id', 'version', 'consented_at']
        read_only_fields = ['id', 'version', 'consented_at']
