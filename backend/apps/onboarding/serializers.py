"""Serializers for onboarding questionnaire API."""

from rest_framework import serializers
from .models import UserProfile, UserGoals


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user attachment style and communication preferences."""

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'attachment_anxiety',
            'attachment_avoidance',
            'conflict_style',
            'communication_frequency',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_attachment_anxiety(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('불안 애착 수준은 1에서 5 사이여야 합니다.')
        return value

    def validate_attachment_avoidance(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('회피 애착 수준은 1에서 5 사이여야 합니다.')
        return value


class UserGoalsSerializer(serializers.ModelSerializer):
    """Serializer for user relationship goals."""

    class Meta:
        model = UserGoals
        fields = [
            'id',
            'primary_goal',
            'focus_areas',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_focus_areas(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('집중 영역은 목록 형태여야 합니다.')
        if len(value) > 3:
            raise serializers.ValidationError('집중 영역은 최대 3개까지 선택할 수 있습니다.')
        return value


class OnboardingCompleteSerializer(serializers.Serializer):
    """Serializer for completing onboarding in one request."""

    # Profile fields
    attachment_anxiety = serializers.IntegerField(min_value=1, max_value=5)
    attachment_avoidance = serializers.IntegerField(min_value=1, max_value=5)
    conflict_style = serializers.ChoiceField(choices=UserProfile.ConflictStyle.choices)
    communication_frequency = serializers.ChoiceField(choices=UserProfile.CommunicationFrequency.choices)

    # Goals fields
    primary_goal = serializers.ChoiceField(choices=UserGoals.PrimaryGoal.choices)
    focus_areas = serializers.ListField(
        child=serializers.CharField(max_length=100),
        max_length=3,
        allow_empty=True
    )

    def validate_attachment_anxiety(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('불안 애착 수준은 1에서 5 사이여야 합니다.')
        return value

    def validate_attachment_avoidance(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('회피 애착 수준은 1에서 5 사이여야 합니다.')
        return value

    def create(self, validated_data):
        user = self.context['request'].user

        # Create or update UserProfile
        profile, _ = UserProfile.objects.update_or_create(
            user=user,
            defaults={
                'attachment_anxiety': validated_data['attachment_anxiety'],
                'attachment_avoidance': validated_data['attachment_avoidance'],
                'conflict_style': validated_data['conflict_style'],
                'communication_frequency': validated_data['communication_frequency'],
            }
        )

        # Create or update UserGoals
        goals, _ = UserGoals.objects.update_or_create(
            user=user,
            defaults={
                'primary_goal': validated_data['primary_goal'],
                'focus_areas': validated_data['focus_areas'],
            }
        )

        # Mark user's onboarding as completed
        user.onboarding_completed = True
        user.save(update_fields=['onboarding_completed'])

        return {'profile': profile, 'goals': goals}


class OnboardingStatusSerializer(serializers.Serializer):
    """Serializer for onboarding completion status."""

    profile_complete = serializers.BooleanField()
    goals_complete = serializers.BooleanField()
    onboarding_complete = serializers.BooleanField()
