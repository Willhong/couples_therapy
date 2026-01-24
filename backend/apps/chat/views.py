"""Views for chat API."""

import asyncio
import json
import logging

from django.db import models
from django.http import StreamingHttpResponse
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
from .services.reframing_graph import run_reframing_pipeline, stream_reframing_pipeline
from .services.context_manager import ConversationContextManager

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
    """Process a message through the reframing pipeline.

    This endpoint runs the full LangGraph reframing pipeline and returns
    the structured result. For real-time streaming, use stream_reframe instead.

    Request body:
        conversation_id: UUID of the conversation
        message: User's message describing the conflict

    Returns:
        final_response: The complete reframing response
        analysis: Structured analysis data (bidirectional perspectives)
        suggestions: List of actionable suggestions
        is_abuse_detected: Whether abuse patterns were detected
        message_id: UUID of the saved AI response message
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

    # Run reframing pipeline
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

    # Save AI response
    ai_msg = Message.objects.create(
        conversation=conversation,
        role=Message.Role.ASSISTANT,
        content=result['final_response'],
        has_reframing=True,
        reframing_data={
            'analysis': result.get('analysis'),
            'suggestions': result.get('suggestions', []),
            'is_abuse_detected': result.get('is_abuse_detected', False),
        },
    )

    # Update conversation timestamp
    conversation.save()

    return Response({
        'final_response': result['final_response'],
        'analysis': result.get('analysis'),
        'suggestions': result.get('suggestions', []),
        'is_abuse_detected': result.get('is_abuse_detected', False),
        'message_id': str(ai_msg.id),
        'user_message_id': str(user_msg.id),
    })


async def _generate_sse_stream(user_message: str, conversation_context: str):
    """Async generator for SSE streaming.

    Yields Server-Sent Events formatted data.
    """
    try:
        async for event in stream_reframing_pipeline(
            user_message=user_message,
            conversation_context=conversation_context,
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

        yield "data: [DONE]\n\n"
    except LLMConfigurationError as e:
        error_data = json.dumps({'type': 'error', 'message': f'LLM 설정 오류: {str(e)}'})
        yield f"data: {error_data}\n\n"
    except Exception as e:
        logger.exception(f"Streaming error: {e}")
        error_data = json.dumps({'type': 'error', 'message': '스트리밍 중 오류가 발생했습니다.'})
        yield f"data: {error_data}\n\n"


def _sync_sse_generator(user_message: str, conversation_context: str):
    """Synchronous wrapper for async SSE generator."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        async_gen = _generate_sse_stream(user_message, conversation_context)
        while True:
            try:
                chunk = loop.run_until_complete(async_gen.__anext__())
                yield chunk
            except StopAsyncIteration:
                break
    finally:
        loop.close()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_reframing(request):
    """Save AI reframing response after streaming completes.

    This endpoint is called by the mobile app after stream_reframe completes
    to persist the AI response.

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
def stream_reframe(request):
    """Stream reframing response via Server-Sent Events (SSE).

    This endpoint streams the reframing pipeline progress and final response
    as SSE events. Use this for real-time UI updates showing AI thinking status.

    Request body:
        conversation_id: UUID of the conversation
        message: User's message describing the conflict

    Response: text/event-stream with events:
        - type: "status" - Pipeline node progress (node name, status message)
        - type: "complete" - Final response with analysis and suggestions
        - type: "error" - Error occurred during processing
        - [DONE] - Stream complete signal
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
    Message.objects.create(
        conversation=conversation,
        role=Message.Role.USER,
        content=user_message,
    )

    # Get conversation context
    context_manager = ConversationContextManager(str(conversation_id))
    conversation_context = context_manager.get_context_for_ai()

    # Create streaming response
    response = StreamingHttpResponse(
        _sync_sse_generator(user_message, conversation_context),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering

    return response
