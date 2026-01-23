"""URL routes for onboarding API."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    UserProfileViewSet,
    UserGoalsViewSet,
    OnboardingStatusView,
    OnboardingCompleteView,
)

router = DefaultRouter()
router.register(r'profile', UserProfileViewSet, basename='profile')
router.register(r'goals', UserGoalsViewSet, basename='goals')

urlpatterns = [
    path('status/', OnboardingStatusView.as_view(), name='onboarding-status'),
    path('complete/', OnboardingCompleteView.as_view(), name='onboarding-complete'),
] + router.urls
