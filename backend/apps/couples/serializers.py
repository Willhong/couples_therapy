"""Serializers for couple and invite code endpoints."""

from rest_framework import serializers
from django.conf import settings

from .models import Couple, InviteCode
from apps.users.serializers import UserSerializer


class InviteCodeSerializer(serializers.ModelSerializer):
    """Serializer for invite codes."""

    deep_link = serializers.SerializerMethodField()

    class Meta:
        model = InviteCode
        fields = ['code', 'expires_at', 'deep_link', 'created_at']
        read_only_fields = ['code', 'expires_at', 'deep_link', 'created_at']

    def get_deep_link(self, obj):
        """Generate deep link URL for the invite code."""
        return f'couplesai://invite?code={obj.code}'


class PartnerSerializer(serializers.Serializer):
    """Serializer for partner info in couple context."""

    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class CoupleSerializer(serializers.ModelSerializer):
    """Serializer for couple information."""

    partner = serializers.SerializerMethodField()

    class Meta:
        model = Couple
        fields = ['id', 'status', 'connected_at', 'created_at', 'partner']
        read_only_fields = ['id', 'status', 'connected_at', 'created_at']

    def get_partner(self, obj):
        """Get partner info for the requesting user."""
        request = self.context.get('request')
        if not request:
            return None

        partner = obj.get_partner(request.user)
        if partner:
            return PartnerSerializer(partner).data
        return None
