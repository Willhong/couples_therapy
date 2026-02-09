"""Views for partner linking and couple management."""

import logging

from django.db import models
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import InviteCode, Couple
from .serializers import InviteCodeSerializer, CoupleSerializer
from apps.core.notifications import send_push_notification

logger = logging.getLogger(__name__)


class InviteCodeViewSet(viewsets.ViewSet):
    """ViewSet for invite code generation and redemption."""

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate new invite code for current user."""
        try:
            invite_code = InviteCode.create_for_user(request.user)
            serializer = InviteCodeSerializer(invite_code)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def redeem(self, request):
        """Redeem invite code to connect with partner."""
        code = request.data.get('code', '').upper().strip()

        if not code:
            return Response(
                {'error': '코드를 입력해주세요.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            invite_code = InviteCode.objects.get(code=code)
        except InviteCode.DoesNotExist:
            return Response(
                {'error': '유효하지 않은 코드입니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not invite_code.is_valid:
            return Response(
                {'error': '만료되었거나 이미 사용된 코드입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if invite_code.creator == request.user:
            return Response(
                {'error': '본인의 코드는 사용할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user already in an active couple
        existing = Couple.objects.filter(
            models.Q(user1=request.user) | models.Q(user2=request.user),
            status=Couple.Status.ACTIVE
        ).exists()

        if existing:
            return Response(
                {'error': '이미 파트너와 연결되어 있습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Connect the couple
        couple = invite_code.couple
        couple.user2 = request.user
        couple.status = Couple.Status.ACTIVE
        couple.connected_at = timezone.now()
        couple.save()

        # Mark code as used
        invite_code.used_by = request.user
        invite_code.used_at = timezone.now()
        invite_code.save()

        # Send push notification to partner (the inviter)
        try:
            if invite_code.creator.expo_push_token:
                send_push_notification(
                    invite_code.creator.expo_push_token,
                    'partner_connected',
                    data={'couple_id': couple.id}
                )
        except Exception as e:
            logger.warning(f"Failed to send partner connected notification: {e}")

        serializer = CoupleSerializer(couple, context={'request': request})
        return Response({
            'message': '파트너와 연결되었습니다!',
            'couple': serializer.data
        })


class CoupleViewSet(viewsets.ViewSet):
    """ViewSet for couple management."""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get current user's couple info."""
        couple = Couple.objects.filter(
            models.Q(user1=request.user) | models.Q(user2=request.user),
            status=Couple.Status.ACTIVE
        ).first()

        if not couple:
            return Response({'couple': None})

        serializer = CoupleSerializer(couple, context={'request': request})
        return Response({'couple': serializer.data})

    @action(detail=False, methods=['post'])
    def disconnect(self, request):
        """Disconnect from partner."""
        couple = Couple.objects.filter(
            models.Q(user1=request.user) | models.Q(user2=request.user),
            status=Couple.Status.ACTIVE
        ).first()

        if not couple:
            return Response(
                {'error': '연결된 파트너가 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get partner before disconnecting
        partner = couple.user2 if couple.user1 == request.user else couple.user1

        couple.status = Couple.Status.DISCONNECTED
        couple.disconnected_at = timezone.now()
        couple.save()

        # Send push notification to partner
        try:
            if partner.expo_push_token:
                send_push_notification(
                    partner.expo_push_token,
                    'partner_disconnected',
                    data={'couple_id': couple.id}
                )
        except Exception as e:
            logger.warning(f"Failed to send partner disconnected notification: {e}")

        return Response({'message': '파트너 연결이 해제되었습니다.'})
