"""Views for consent history and management."""

from rest_framework import viewsets, permissions
from rest_framework.response import Response
from django.db import models

from .models import RecordingConsent, DisclaimerConsent
from .serializers import RecordingConsentSerializer, DisclaimerConsentSerializer


class ConsentHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing consent history.

    list: GET /api/v1/consents/history/
        Returns all recording consents where user is requester or responder.

    retrieve: GET /api/v1/consents/history/{id}/
        Returns a specific consent record.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RecordingConsentSerializer

    def get_queryset(self):
        """Filter consents to only those involving the current user."""
        user = self.request.user
        return RecordingConsent.objects.filter(
            models.Q(requester=user) | models.Q(responder=user)
        ).select_related('couple', 'requester', 'responder').order_by('-created_at')


class DisclaimerConsentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing disclaimer consent history.

    list: GET /api/v1/consents/disclaimers/
        Returns all disclaimer consents for the current user.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DisclaimerConsentSerializer

    def get_queryset(self):
        """Filter to only current user's disclaimer consents."""
        return DisclaimerConsent.objects.filter(
            user=self.request.user
        ).order_by('-consented_at')
