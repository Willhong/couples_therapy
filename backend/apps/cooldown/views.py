"""Views for cool-down timer API."""

from django.db import models
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.couples.models import Couple
from .models import CoolDown
from .serializers import CoolDownSerializer, CoolDownStartSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_cooldown(request):
    """Start a new cool-down session.

    Body: {"duration_seconds": 600}  (optional, defaults to 600)

    Returns the created cool-down session.
    """
    serializer = CoolDownStartSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    duration = serializer.validated_data['duration_seconds']

    # Deactivate any existing active cool-downs for this user
    CoolDown.objects.filter(
        user=user,
        is_active=True
    ).update(is_active=False, completed_at=timezone.now())

    # Get user's couple (if they have one)
    couple = Couple.objects.filter(
        (models.Q(user1=user) | models.Q(user2=user)),
        status=Couple.Status.ACTIVE
    ).first()

    # Create new cool-down session
    cooldown = CoolDown.objects.create(
        user=user,
        couple=couple,
        duration_seconds=duration,
    )

    return Response(
        CoolDownSerializer(cooldown).data,
        status=status.HTTP_201_CREATED
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_cooldown(request):
    """Get the current active cool-down session (if any).

    Returns the active session or 404 if none exists.
    """
    try:
        cooldown = CoolDown.objects.get(
            user=request.user,
            is_active=True
        )
    except CoolDown.DoesNotExist:
        return Response(
            {'detail': '활성화된 쿨다운 세션이 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response(CoolDownSerializer(cooldown).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_cooldown(request, cooldown_id):
    """Mark a cool-down session as completed.

    Only the owner can complete their own cool-down.
    """
    try:
        cooldown = CoolDown.objects.get(
            id=cooldown_id,
            user=request.user,
        )
    except CoolDown.DoesNotExist:
        return Response(
            {'detail': '쿨다운 세션을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not cooldown.is_active:
        return Response(
            {'detail': '이미 완료된 세션입니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    cooldown.is_active = False
    cooldown.completed_at = timezone.now()
    cooldown.save(update_fields=['is_active', 'completed_at'])

    return Response(CoolDownSerializer(cooldown).data)
