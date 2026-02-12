"""User serializers for authentication and user management."""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone

from .models import User, NotificationPreferences


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer that uses email instead of username."""

    username_field = User.USERNAME_FIELD  # 'email'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # The parent class creates a field named 'username' by default.
        # We need to remove it and ensure 'email' field exists.
        if 'username' in self.fields:
            del self.fields['username']
        if 'email' not in self.fields:
            self.fields['email'] = serializers.EmailField(required=True)


class CustomRegisterSerializer(serializers.Serializer):
    """Custom registration serializer for email-only authentication with disclaimer consent.

    This serializer completely replaces the dj-rest-auth RegisterSerializer
    because our User model has no username field (email-only auth).
    """

    email = serializers.EmailField(required=True)
    password1 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    disclaimer_accepted = serializers.BooleanField(required=True)
    disclaimer_version = serializers.CharField(required=True, max_length=10)

    def validate_email(self, value):
        """Ensure email is unique."""
        email = value.lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.")
        return email

    def validate_disclaimer_accepted(self, value):
        if not value:
            raise serializers.ValidationError("면책조항에 동의해야 합니다.")
        return value

    def validate(self, data):
        """Ensure passwords match."""
        if data.get('password1') != data.get('password2'):
            raise serializers.ValidationError({"password2": "비밀번호가 일치하지 않습니다."})
        return data

    def get_cleaned_data(self):
        """Return cleaned data for user creation."""
        return {
            'email': self.validated_data.get('email', ''),
            'password': self.validated_data.get('password1', ''),
        }

    def save(self, request):
        """Create and return a new user."""
        cleaned_data = self.get_cleaned_data()

        # Create user
        user = User.objects.create_user(
            email=cleaned_data['email'],
            password=cleaned_data['password'],
        )

        # Set disclaimer fields
        user.disclaimer_accepted = True
        user.disclaimer_accepted_at = timezone.now()
        user.disclaimer_version = self.validated_data.get('disclaimer_version')
        user.save()

        # Create DisclaimerConsent record for audit trail
        from apps.consents.models import DisclaimerConsent
        DisclaimerConsent.objects.create(
            user=user,
            version=user.disclaimer_version,
            content_hash=user.disclaimer_version,  # In production, hash the actual content
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        return user

    def _get_client_ip(self, request):
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


class NotificationPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreferences
        fields = ['push_enabled', 'daily_prompt_enabled', 'partner_activity_enabled', 'weekly_insights_enabled']
