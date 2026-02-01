"""Views for onboarding questionnaire API."""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile, UserGoals
from .serializers import (
    UserProfileSerializer,
    UserGoalsSerializer,
    OnboardingCompleteSerializer,
    OnboardingStatusSerializer,
)


class UserProfileViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user profile (attachment style, communication preferences).

    Singleton resource: one profile per user. GET/PUT/PATCH all work on /profile/
    without requiring a pk, since get_object resolves by current user.
    """

    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch']

    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)

    def get_object(self):
        """Get or create the profile for the current user."""
        profile, _ = UserProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                'attachment_anxiety': 3,
                'attachment_avoidance': 3,
                'conflict_style': UserProfile.ConflictStyle.COLLABORATE,
                'communication_frequency': UserProfile.CommunicationFrequency.DAILY,
            }
        )
        return profile

    def list(self, request):
        """Return the user's profile."""
        profile = self.get_object()
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    def create(self, request):
        """Upsert profile (singleton resource — POST acts as update)."""
        profile = self.get_object()
        serializer = self.get_serializer(profile, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class UserGoalsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user goals.

    Singleton resource: one goals record per user. POST acts as upsert.
    """

    serializer_class = UserGoalsSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch']

    def get_queryset(self):
        return UserGoals.objects.filter(user=self.request.user)

    def get_object(self):
        """Get or create the goals for the current user."""
        goals, _ = UserGoals.objects.get_or_create(
            user=self.request.user,
            defaults={
                'primary_goal': UserGoals.PrimaryGoal.IMPROVEMENT,
                'focus_areas': [],
            }
        )
        return goals

    def list(self, request):
        """Return the user's goals."""
        goals = self.get_object()
        serializer = self.get_serializer(goals)
        return Response(serializer.data)

    def create(self, request):
        """Upsert goals (singleton resource — POST acts as update)."""
        goals = self.get_object()
        serializer = self.get_serializer(goals, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class OnboardingStatusView(APIView):
    """View for checking onboarding completion status."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return onboarding completion status."""
        user = request.user

        profile_complete = UserProfile.objects.filter(user=user).exists()
        goals_complete = UserGoals.objects.filter(user=user).exists()
        onboarding_complete = user.onboarding_completed

        data = {
            'profile_complete': profile_complete,
            'goals_complete': goals_complete,
            'onboarding_complete': onboarding_complete,
        }

        serializer = OnboardingStatusSerializer(data)
        return Response(serializer.data)


class OnboardingCompleteView(APIView):
    """View for completing onboarding in one request."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Complete onboarding with all questionnaire data."""
        serializer = OnboardingCompleteSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            result = serializer.save()
            return Response({
                'profile': UserProfileSerializer(result['profile']).data,
                'goals': UserGoalsSerializer(result['goals']).data,
                'message': '온보딩이 완료되었습니다.'
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
