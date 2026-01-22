"""User serializers - Placeholder for Task 2."""

from dj_rest_auth.registration.serializers import RegisterSerializer
from rest_framework import serializers
from django.utils import timezone


class CustomRegisterSerializer(RegisterSerializer):
    """Custom registration serializer with disclaimer consent."""

    disclaimer_accepted = serializers.BooleanField(required=True)
    disclaimer_version = serializers.CharField(required=True)

    def validate_disclaimer_accepted(self, value):
        if not value:
            raise serializers.ValidationError(
                "면책조항에 동의해야 합니다."
            )
        return value

    def custom_signup(self, request, user):
        user.disclaimer_accepted = True
        user.disclaimer_accepted_at = timezone.now()
        user.disclaimer_version = self.validated_data.get('disclaimer_version')
        user.save()


class UserSerializer(serializers.Serializer):
    """Basic user serializer."""

    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    disclaimer_accepted = serializers.BooleanField(read_only=True)
    onboarding_completed = serializers.BooleanField(read_only=True)
    tutorial_completed = serializers.BooleanField(read_only=True)
