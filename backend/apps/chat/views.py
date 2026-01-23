"""Views for chat API."""

from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Conversation, Message, SharedReframing
from .serializers import (
    ConversationSerializer,
    ConversationDetailSerializer,
    ConversationCreateSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    SharedReframingSerializer,
)


class ConversationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing conversations."""

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return ConversationCreateSerializer
        elif self.action == 'retrieve':
            return ConversationDetailSerializer
        return ConversationSerializer

    def get_queryset(self):
        """Return conversations for the authenticated user only."""
        return Conversation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Create conversation for the authenticated user."""
        from apps.couples.models import Couple

        user = self.request.user
        couple = Couple.objects.filter(
            (models.Q(user1=user) | models.Q(user2=user)),
            status=Couple.Status.ACTIVE
        ).first()

        serializer.save(user=user, couple=couple)


class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing messages within a conversation."""

    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']  # No update/delete

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer

    def get_queryset(self):
        """Return messages for the conversation if user owns it."""
        conversation_id = self.kwargs.get('conversation_pk')
        user = self.request.user

        # Verify user owns the conversation
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                user=user
            )
        except Conversation.DoesNotExist:
            return Message.objects.none()

        return Message.objects.filter(conversation=conversation)

    def get_serializer_context(self):
        """Add conversation to serializer context."""
        context = super().get_serializer_context()
        conversation_id = self.kwargs.get('conversation_pk')

        if conversation_id:
            try:
                conversation = Conversation.objects.get(
                    id=conversation_id,
                    user=self.request.user
                )
                context['conversation'] = conversation
            except Conversation.DoesNotExist:
                pass

        return context

    def create(self, request, *args, **kwargs):
        """Create a new message in the conversation."""
        conversation_id = self.kwargs.get('conversation_pk')

        # Verify user owns the conversation
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                user=request.user
            )
        except Conversation.DoesNotExist:
            return Response(
                {'detail': '대화를 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Update conversation's updated_at
        conversation.save()  # This triggers auto_now on updated_at

        return super().create(request, *args, **kwargs)


class SharedReframingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing shared reframings."""

    serializer_class = SharedReframingSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']  # No update/delete

    def get_queryset(self):
        """Return reframings shared with the authenticated user."""
        return SharedReframing.objects.filter(shared_with=self.request.user)

    @action(detail=False, methods=['get'])
    def sent(self, request):
        """Return reframings shared by the authenticated user."""
        queryset = SharedReframing.objects.filter(shared_by=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
