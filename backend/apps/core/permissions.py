"""Custom permissions for the couples therapy app."""

from django.db import models
from rest_framework import permissions


class IsCouplePartner(permissions.BasePermission):
    """Permission to check if user is part of the couple."""

    message = "이 작업은 커플 관계에 있는 사용자만 수행할 수 있습니다."

    def has_object_permission(self, request, view, obj):
        """Check if user is part of the couple."""
        from apps.couples.models import Couple

        # If the object is a Couple instance
        if isinstance(obj, Couple):
            return obj.user1 == request.user or obj.user2 == request.user

        # If the object has a couple attribute
        if hasattr(obj, 'couple'):
            return (
                obj.couple.user1 == request.user or
                obj.couple.user2 == request.user
            )

        return False


class IsConsentParticipant(permissions.BasePermission):
    """Permission to check if user is requester or responder of a consent."""

    message = "이 동의 요청에 참여하지 않은 사용자입니다."

    def has_object_permission(self, request, view, obj):
        """Check if user is participant in the consent."""
        from apps.consents.models import RecordingConsent

        if isinstance(obj, RecordingConsent):
            return (
                obj.requester == request.user or
                obj.responder == request.user
            )

        return False


class IsOwner(permissions.BasePermission):
    """Permission to check if user owns the resource."""

    message = "이 리소스의 소유자만 접근할 수 있습니다."

    def has_object_permission(self, request, view, obj):
        """Check if user is the owner."""
        # Check for common owner field names
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        if hasattr(obj, 'creator'):
            return obj.creator == request.user

        return False
