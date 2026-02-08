"""Views for chat API."""

import asyncio
import logging

from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
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
from .services.llm_service import get_provider_info, LLMConfigurationError
from .services.reframing_graph import run_reframing_pipeline, run_comfort_pipeline
from .services.context_manager import ConversationContextManager
from apps.safety.crisis import detect_crisis

logger = logging.getLogger(__name__)


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

    @action(detail=True, methods=['post'])
    def toggle_saved(self, request, conversation_pk=None, pk=None):
        """Toggle the saved state of a message."""
        try:
            message = self.get_queryset().get(pk=pk)
        except Message.DoesNotExist:
            return Response(
                {'detail': '메시지를 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        message.is_saved = not message.is_saved
        message.save()

        return Response({
            'is_saved': message.is_saved,
            'message_id': str(message.id)
        })


class SharedReframingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing shared reframings."""

    serializer_class = SharedReframingSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']  # No update/delete

    def get_queryset(self):
        """Return reframings shared with the authenticated user."""
        return SharedReframing.objects.filter(shared_with=self.request.user).select_related(
            'message', 'shared_by'
        ).order_by('-shared_at')

    @action(detail=False, methods=['get'])
    def sent(self, request):
        """Return reframings shared by the authenticated user."""
        queryset = SharedReframing.objects.filter(shared_by=request.user).select_related(
            'message', 'shared_with'
        ).order_by('-shared_at')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Add partner response to a shared reframing."""
        try:
            shared = self.get_queryset().get(pk=pk)
        except SharedReframing.DoesNotExist:
            return Response(
                {'detail': '공유된 리프레이밍을 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        partner_response = request.data.get('partner_response')
        if not partner_response:
            return Response(
                {'detail': 'partner_response가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        shared.partner_response = partner_response
        shared.save()

        return Response(self.get_serializer(shared).data)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        """Mark a shared reframing as read."""
        try:
            shared = self.get_queryset().get(pk=pk)
        except SharedReframing.DoesNotExist:
            return Response(
                {'detail': '공유된 리프레이밍을 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        shared.is_read = True
        shared.save()

        return Response({'status': 'success', 'is_read': True})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """Return count of unread shared reframings."""
        count = SharedReframing.objects.filter(
            shared_with=request.user,
            is_read=False
        ).count()

        return Response({'count': count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def llm_info(request):
    """Get information about the configured LLM provider.

    Returns provider name, models, and configuration status.
    Useful for debugging and mobile app display.
    """
    info = get_provider_info()
    return Response(info)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reframe_message(request):
    """Process a message through the two-mode reframing pipeline.

    The LLM decides whether to respond conversationally (chat mode)
    or produce structured reframing analysis (reframing mode).

    Request body:
        conversation_id: UUID of the conversation
        message: User's message describing the conflict

    Returns:
        For chat mode:
            mode: 'chat'
            message: The conversational response text
            message_id: UUID of the saved AI message
            user_message_id: UUID of the saved user message

        For reframing mode:
            mode: 'reframing'
            final_response: The complete reframing response
            analysis: Structured analysis data (bidirectional perspectives)
            suggestions: List of actionable suggestions
            is_abuse_detected: Whether abuse patterns were detected
            message_id: UUID of the saved AI message
            user_message_id: UUID of the saved user message
    """
    conversation_id = request.data.get('conversation_id')
    user_message = request.data.get('message')

    if not conversation_id or not user_message:
        return Response(
            {'detail': 'conversation_id와 message가 필요합니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )

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

    # Save user message
    user_msg = Message.objects.create(
        conversation=conversation,
        role=Message.Role.USER,
        content=user_message,
    )

    # Get conversation context
    context_manager = ConversationContextManager(str(conversation_id))
    conversation_context = context_manager.get_context_for_ai()

    # Crisis detection check
    crisis_result = detect_crisis(user_message)
    if crisis_result['is_crisis']:
        from apps.safety.models import CrisisEvent
        CrisisEvent.objects.create(
            user=request.user,
            conversation=conversation,
            crisis_type=crisis_result['crisis_type'],
            severity=crisis_result['severity'],
            matched_keywords=crisis_result['matched_keywords'],
            message_content=user_message[:500],
            response_shown='crisis_safety_response'
        )
        safety_response = (
            "긴급 도움이 필요하신 것 같습니다.\n\n"
            "지금 힘든 상황이라면, 전문 상담사와 이야기해 주세요:\n"
            "• 자살예방상담전화: 1393 (24시간)\n"
            "• 정신건강위기상담전화: 1577-0199 (24시간)\n"
            "• 여성긴급전화: 1366 (24시간)\n"
            "• 경찰: 112\n\n"
            "당신은 혼자가 아닙니다. 도움을 받을 수 있습니다."
        )
        ai_msg = Message.objects.create(
            conversation=conversation,
            role=Message.Role.ASSISTANT,
            content=safety_response,
        )
        return Response({
            'mode': 'crisis',
            'crisis_type': crisis_result['crisis_type'],
            'final_response': safety_response,
            'message_id': str(ai_msg.id),
        })

    # Run two-mode reframing pipeline
    try:
        result = asyncio.run(run_reframing_pipeline(
            user_message=user_message,
            conversation_context=conversation_context,
        ))
    except LLMConfigurationError as e:
        logger.error(f"LLM configuration error: {e}")
        return Response(
            {'detail': f'LLM 설정 오류: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        logger.exception(f"Reframing pipeline error: {e}")
        return Response(
            {'detail': '리프레이밍 처리 중 오류가 발생했습니다.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Determine mode and save accordingly
    mode = result.get('mode', 'reframing')
    is_reframing = (mode == 'reframing')

    # Save AI response -- mode determines has_reframing and reframing_data
    ai_msg = Message.objects.create(
        conversation=conversation,
        role=Message.Role.ASSISTANT,
        content=result['final_response'],
        has_reframing=is_reframing,
        reframing_data={
            'analysis': result.get('analysis'),
            'suggestions': result.get('suggestions', []),
            'is_abuse_detected': result.get('is_abuse_detected', False),
        } if is_reframing else None,
    )

    # Update conversation timestamp
    conversation.save()

    # Trigger async pattern analysis
    try:
        from apps.patterns.tasks import analyze_patterns
        analyze_patterns.delay(str(conversation.id))
    except Exception as e:
        logger.warning(f"Failed to queue pattern analysis: {e}")

    # Build response based on mode
    if is_reframing:
        return Response({
            'mode': 'reframing',
            'final_response': result['final_response'],
            'analysis': result.get('analysis'),
            'suggestions': result.get('suggestions', []),
            'is_abuse_detected': result.get('is_abuse_detected', False),
            'message_id': str(ai_msg.id),
            'user_message_id': str(user_msg.id),
        })
    else:
        return Response({
            'mode': 'chat',
            'message': result['final_response'],
            'message_id': str(ai_msg.id),
            'user_message_id': str(user_msg.id),
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_reframing(request):
    """Save AI reframing response.

    This endpoint persists an AI response message in the conversation.

    Request body:
        conversation_id: UUID of the conversation
        content: The AI response text
        reframing_data: Structured reframing data (analysis, suggestions)

    Returns:
        The saved message object
    """
    conversation_id = request.data.get('conversation_id')
    content = request.data.get('content')
    reframing_data = request.data.get('reframing_data')

    if not conversation_id or not content:
        return Response(
            {'detail': 'conversation_id와 content가 필요합니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )

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

    # Save AI response
    ai_msg = Message.objects.create(
        conversation=conversation,
        role=Message.Role.ASSISTANT,
        content=content,
        has_reframing=bool(reframing_data),
        reframing_data=reframing_data,
    )

    # Update conversation timestamp
    conversation.save()

    return Response(MessageSerializer(ai_msg).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def share_reframing(request):
    """Share a reframing with partner via HTTP API.

    This endpoint is a fallback when WebSocket is not available.

    Request body:
        message_id: UUID of the message with reframing to share
        privacy_level: 'full' or 'summary'

    Returns:
        The created SharedReframing object
    """
    from apps.couples.models import Couple

    message_id = request.data.get('message_id')
    privacy_level = request.data.get('privacy_level', 'full')

    if not message_id:
        return Response(
            {'detail': 'message_id가 필요합니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if privacy_level not in ['full', 'summary']:
        return Response(
            {'detail': 'privacy_level은 full 또는 summary여야 합니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find the message and verify user owns the conversation
    try:
        message = Message.objects.select_related('conversation').get(id=message_id)
        if message.conversation.user != request.user:
            return Response(
                {'detail': '메시지를 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
    except Message.DoesNotExist:
        return Response(
            {'detail': '메시지를 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Verify message has reframing data
    if not message.has_reframing:
        return Response(
            {'detail': '이 메시지에는 리프레이밍 데이터가 없습니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find partner
    user = request.user
    couple = Couple.objects.filter(
        (models.Q(user1=user) | models.Q(user2=user)),
        status=Couple.Status.ACTIVE
    ).first()

    if not couple:
        return Response(
            {'detail': '연결된 파트너가 없습니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    partner = couple.user2 if couple.user1 == user else couple.user1

    # Create shared reframing
    shared = SharedReframing.objects.create(
        message=message,
        shared_by=user,
        shared_with=partner,
        privacy_level=privacy_level,
    )

    return Response(SharedReframingSerializer(shared).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comfort_message(request):
    """Process a message through the comfort mode pipeline.

    Returns an empathetic response that validates the user's emotions
    without reframing or analysis.

    Request body:
        conversation_id: UUID of the conversation
        message: User's message expressing difficult emotions

    Returns:
        mode: 'comfort'
        final_response: The empathetic response text
        message_id: UUID of the saved AI message
        user_message_id: UUID of the saved user message
    """
    conversation_id = request.data.get('conversation_id')
    user_message = request.data.get('message')

    if not conversation_id or not user_message:
        return Response(
            {'detail': 'conversation_id와 message가 필요합니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )

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

    # Save user message
    user_msg = Message.objects.create(
        conversation=conversation,
        role=Message.Role.USER,
        content=user_message,
    )

    # Get conversation context
    context_manager = ConversationContextManager(str(conversation_id))
    conversation_context = context_manager.get_context_for_ai()

    # Crisis detection check
    crisis_result = detect_crisis(user_message)
    if crisis_result['is_crisis']:
        from apps.safety.models import CrisisEvent
        CrisisEvent.objects.create(
            user=request.user,
            conversation=conversation,
            crisis_type=crisis_result['crisis_type'],
            severity=crisis_result['severity'],
            matched_keywords=crisis_result['matched_keywords'],
            message_content=user_message[:500],
            response_shown='crisis_safety_response'
        )
        safety_response = (
            "긴급 도움이 필요하신 것 같습니다.\n\n"
            "지금 힘든 상황이라면, 전문 상담사와 이야기해 주세요:\n"
            "• 자살예방상담전화: 1393 (24시간)\n"
            "• 정신건강위기상담전화: 1577-0199 (24시간)\n"
            "• 여성긴급전화: 1366 (24시간)\n"
            "• 경찰: 112\n\n"
            "당신은 혼자가 아닙니다. 도움을 받을 수 있습니다."
        )
        ai_msg = Message.objects.create(
            conversation=conversation,
            role=Message.Role.ASSISTANT,
            content=safety_response,
        )
        return Response({
            'mode': 'crisis',
            'crisis_type': crisis_result['crisis_type'],
            'final_response': safety_response,
            'message_id': str(ai_msg.id),
        })

    # Run comfort pipeline
    try:
        result = asyncio.run(run_comfort_pipeline(
            user_message=user_message,
            conversation_context=conversation_context,
        ))
    except LLMConfigurationError as e:
        logger.error(f"LLM configuration error: {e}")
        return Response(
            {'detail': f'LLM 설정 오류: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        logger.exception(f"Comfort pipeline error: {e}")
        return Response(
            {'detail': '위로 모드 처리 중 오류가 발생했습니다.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Save AI response
    ai_msg = Message.objects.create(
        conversation=conversation,
        role=Message.Role.ASSISTANT,
        content=result['final_response'],
    )

    # Update conversation timestamp
    conversation.save()

    return Response({
        'mode': 'comfort',
        'final_response': result['final_response'],
        'is_abuse_detected': result.get('is_abuse_detected', False),
        'message_id': str(ai_msg.id),
        'user_message_id': str(user_msg.id),
    })
