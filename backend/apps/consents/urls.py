"""URL routing for consents app REST API."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ConsentHistoryViewSet, DisclaimerConsentViewSet

router = DefaultRouter()
router.register('history', ConsentHistoryViewSet, basename='consent-history')
router.register('disclaimers', DisclaimerConsentViewSet, basename='disclaimer-consent')

urlpatterns = [
    path('', include(router.urls)),
]
