"""Views for prompts API."""

from datetime import date, timedelta
from django.db import models
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.couples.models import Couple
from .models import DailyPrompt, DailyPromptAssignment, PromptResponse
from .serializers import (
    DailyPromptAssignmentSerializer,
    PromptResponseCreateSerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def today_prompt(request):
    """Get today's prompt for the user's couple (auto-assigns if none).

    Returns the assignment with prompt details and response status.
    """
    user = request.user

    # Get user's couple
    couple = Couple.objects.filter(
        Q(user1=user) | Q(user2=user),
        status=Couple.Status.ACTIVE
    ).first()

    if not couple:
        return Response(
            {'detail': '활성화된 커플이 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )

    today = date.today()

    # Check if couple has an assignment for today
    assignment = DailyPromptAssignment.objects.filter(
        couple=couple,
        assigned_date=today
    ).select_related('prompt').prefetch_related('responses__user').first()

    if not assignment:
        # Auto-assign a new prompt
        # Get prompts not used in the last 30 days for this couple
        recent_prompt_ids = DailyPromptAssignment.objects.filter(
            couple=couple,
            assigned_date__gte=date.today() - timedelta(days=30)
        ).values_list('prompt_id', flat=True)

        available_prompts = DailyPrompt.objects.filter(
            is_active=True
        ).exclude(id__in=recent_prompt_ids)

        # Pick a random prompt
        prompt = available_prompts.order_by('?').first()

        if not prompt:
            # Fallback: pick any active prompt if all were recently used
            prompt = DailyPrompt.objects.filter(is_active=True).order_by('?').first()

        if not prompt:
            return Response(
                {'detail': '사용 가능한 프롬프트가 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create assignment
        assignment = DailyPromptAssignment.objects.create(
            couple=couple,
            prompt=prompt,
            assigned_date=today
        )

    serializer = DailyPromptAssignmentSerializer(assignment)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_prompt(request):
    """Submit response to today's prompt.

    Body: {"response_text": "..."}
    """
    user = request.user

    # Get user's couple
    couple = Couple.objects.filter(
        Q(user1=user) | Q(user2=user),
        status=Couple.Status.ACTIVE
    ).first()

    if not couple:
        return Response(
            {'detail': '활성화된 커플이 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )

    today = date.today()

    # Get today's assignment
    try:
        assignment = DailyPromptAssignment.objects.get(
            couple=couple,
            assigned_date=today
        )
    except DailyPromptAssignment.DoesNotExist:
        return Response(
            {'detail': '오늘의 프롬프트가 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Validate request data
    serializer = PromptResponseCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Check if user already responded
    if PromptResponse.objects.filter(assignment=assignment, user=user).exists():
        return Response(
            {'detail': '이미 답변을 제출했습니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create response
    response_obj = PromptResponse.objects.create(
        assignment=assignment,
        user=user,
        response_text=serializer.validated_data['response_text']
    )

    # Return updated assignment
    assignment.refresh_from_db()
    assignment_serializer = DailyPromptAssignmentSerializer(assignment)
    return Response(assignment_serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reveal_responses(request):
    """Get both responses (only if BOTH partners responded).

    Returns 403 if not both partners have responded yet.
    """
    user = request.user

    # Get user's couple
    couple = Couple.objects.filter(
        Q(user1=user) | Q(user2=user),
        status=Couple.Status.ACTIVE
    ).first()

    if not couple:
        return Response(
            {'detail': '활성화된 커플이 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )

    today = date.today()

    # Get today's assignment
    try:
        assignment = DailyPromptAssignment.objects.select_related(
            'prompt'
        ).prefetch_related('responses__user').get(
            couple=couple,
            assigned_date=today
        )
    except DailyPromptAssignment.DoesNotExist:
        return Response(
            {'detail': '오늘의 프롬프트가 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if both partners responded
    if assignment.responses.count() < 2:
        return Response(
            {'detail': '파트너의 답변을 기다리는 중입니다.'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = DailyPromptAssignmentSerializer(assignment)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def prompt_history(request):
    """Get past prompt exchanges (where both partners responded).

    Returns list of assignments ordered by date (newest first).
    """
    user = request.user

    # Get user's couple
    couple = Couple.objects.filter(
        Q(user1=user) | Q(user2=user),
        status=Couple.Status.ACTIVE
    ).first()

    if not couple:
        return Response(
            {'detail': '활성화된 커플이 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get assignments where both responded, excluding today
    assignments = DailyPromptAssignment.objects.filter(
        couple=couple,
        assigned_date__lt=date.today()
    ).select_related('prompt').prefetch_related('responses__user').annotate(
        response_count=models.Count('responses')
    ).filter(response_count=2).order_by('-assigned_date')[:30]

    serializer = DailyPromptAssignmentSerializer(assignments, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def topic_library(request):
    """Browse conversation topic library by category.

    Query params:
    - category: Filter by category (optional)

    Returns all active prompts grouped by category.
    """
    from .serializers import DailyPromptSerializer

    category = request.query_params.get('category')
    queryset = DailyPrompt.objects.filter(is_active=True)

    if category:
        queryset = queryset.filter(category=category)

    serializer = DailyPromptSerializer(queryset, many=True)

    # Group by category
    grouped = {}
    for item in serializer.data:
        cat = item['category']
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(item)

    return Response(grouped)
