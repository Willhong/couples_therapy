"""User serializers for authentication and user management."""

from dj_rest_auth.registration.serializers import RegisterSerializer
from rest_framework import serializers
from django.utils import timezone

from .models import User


class CustomRegisterSerializer(RegisterSerializer):
    """Custom registration serializer with disclaimer consent."""

    disclaimer_accepted = serializers.BooleanField(required=True)
    disclaimer_version = serializers.CharField(required=True, max_length=10)

    def validate_disclaimer_accepted(self, value):
        if not value:
            raise serializers.ValidationError(
                "면책조항에 동의해야 합니다."
            )
        return value

    def custom_signup(self, request, user):
        """Set user disclaimer fields and create DisclaimerConsent record."""
        user.disclaimer_accepted = True
        user.disclaimer_accepted_at = timezone.now()
        user.disclaimer_version = self.validated_data.get('disclaimer_version')
        user.save()

        # Create DisclaimerConsent record for audit trail
        # Import here to avoid circular imports
        from apps.consents.models import DisclaimerConsent
        DisclaimerConsent.objects.create(
            user=user,
            version=user.disclaimer_version,
            content_hash=user.disclaimer_version,  # In production, hash the actual content
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip


class UserSerializer(serializers.ModelSerializer):
    """User serializer for profile data."""

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'disclaimer_accepted',
            'disclaimer_version',
            'onboarding_completed',
            'tutorial_completed',
            'date_joined',
        ]
        read_only_fields = [
            'id',
            'email',
            'disclaimer_accepted',
            'disclaimer_version',
            'date_joined',
        ]
