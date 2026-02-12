"""Views for pattern analysis API."""

import logging
from collections import Counter
from datetime import date, timedelta

from django.db.models import Avg, Count
from django.db.models.functions import TruncWeek
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Pattern, InsightSummary, WeeklySummary, DailyHealthScore
from .serializers import (
    PatternSerializer,
    InsightSummarySerializer,
    WeeklySummarySerializer,
)
from .services.health_score import HealthScoreService

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pattern_list(request):
    """List all patterns for the authenticated user.

    Query params:
        pattern_type: filter by type (trigger_phrase, recurring_topic, escalation)
        date_from: ISO date string, filter patterns created after this date
        date_to: ISO date string, filter patterns created before this date
        page: page number (default 1)
        page_size: items per page (default 20, max 50)
    """
    user = request.user
    queryset = Pattern.objects.filter(user=user).select_related('conversation', 'couple')

    # Filter by pattern_type
    pattern_type = request.query_params.get('pattern_type')
    if pattern_type:
        queryset = queryset.filter(pattern_type=pattern_type)

    # Filter by date range
    date_from = request.query_params.get('date_from')
    if date_from:
        try:
            date.fromisoformat(date_from)
        except (ValueError, TypeError):
            return Response(
                {'detail': '잘못된 날짜 형식입니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        queryset = queryset.filter(created_at__date__gte=date_from)

    date_to = request.query_params.get('date_to')
    if date_to:
        try:
            date.fromisoformat(date_to)
        except (ValueError, TypeError):
            return Response(
                {'detail': '잘못된 날짜 형식입니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        queryset = queryset.filter(created_at__date__lte=date_to)

    # Simple pagination
    try:
        page = int(request.query_params.get('page', 1))
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = min(int(request.query_params.get('page_size', 20)), 50)
    except (ValueError, TypeError):
        page_size = 20
    start = (page - 1) * page_size
    end = start + page_size

    total = queryset.count()
    patterns = queryset[start:end]

    serializer = PatternSerializer(patterns, many=True)
    return Response({
        'count': total,
        'page': page,
        'page_size': page_size,
        'results': serializer.data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_insights(request, conversation_id):
    """Get InsightSummary for a specific conversation.

    Returns the AI-generated insights with trigger phrases,
    recurring topics, and escalation score for a single session.
    """
    user = request.user

    try:
        insight = InsightSummary.objects.get(
            conversation_id=conversation_id,
            user=user,
        )
    except InsightSummary.DoesNotExist:
        return Response(
            {'detail': '이 대화에 대한 인사이트가 아직 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = InsightSummarySerializer(insight)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def insights_dashboard(request):
    """Aggregated insights dashboard for the authenticated user.

    Returns:
        total_sessions: total conversation count
        top_categories: top 5 recurring topic categories with frequency
        top_triggers: top 5 trigger phrases with count
        avg_escalation: average escalation score
        escalation_by_week: weekly average escalation scores (last 4 weeks)
        sessions_by_week: weekly session counts (last 4 weeks)
    """
    user = request.user
    now = timezone.now()
    four_weeks_ago = now - timedelta(weeks=4)

    # Total sessions analyzed
    total_sessions = InsightSummary.objects.filter(user=user).count()

    # Top categories (from recurring_topic patterns)
    topic_patterns = Pattern.objects.filter(
        user=user,
        pattern_type=Pattern.PatternType.RECURRING_TOPIC,
    )
    category_counter = Counter()
    for p in topic_patterns:
        if p.category:
            category_counter[p.category] += 1

    top_categories = [
        {'category': cat, 'count': count}
        for cat, count in category_counter.most_common(5)
    ]

    # Top trigger phrases
    trigger_patterns = Pattern.objects.filter(
        user=user,
        pattern_type=Pattern.PatternType.TRIGGER_PHRASE,
    )
    trigger_counter = Counter()
    for p in trigger_patterns:
        trigger_counter[p.content] += 1

    top_triggers = [
        {'phrase': phrase, 'count': count}
        for phrase, count in trigger_counter.most_common(5)
    ]

    # Counts
    trigger_phrase_count = trigger_patterns.count()
    recurring_topic_count = topic_patterns.count()

    # Average escalation score
    avg_escalation = InsightSummary.objects.filter(
        user=user,
    ).aggregate(avg=Avg('escalation_score'))['avg'] or 0.0

    # Escalation trend by week (last 4 weeks)
    weekly_escalation = (
        InsightSummary.objects.filter(
            user=user,
            created_at__gte=four_weeks_ago,
        )
        .annotate(week=TruncWeek('created_at'))
        .values('week')
        .annotate(avg_score=Avg('escalation_score'), count=Count('id'))
        .order_by('week')
    )

    escalation_by_week = [
        {
            'week': str(entry['week'].date()),
            'avg_score': round(entry['avg_score'], 1),
            'count': entry['count'],
        }
        for entry in weekly_escalation
    ]

    # Sessions by week (last 4 weeks)
    weekly_sessions = (
        InsightSummary.objects.filter(
            user=user,
            created_at__gte=four_weeks_ago,
        )
        .annotate(week=TruncWeek('created_at'))
        .values('week')
        .annotate(count=Count('id'))
        .order_by('week')
    )

    sessions_by_week = [
        {
            'week': str(entry['week'].date()),
            'count': entry['count'],
        }
        for entry in weekly_sessions
    ]

    return Response({
        'total_sessions': total_sessions,
        'trigger_phrase_count': trigger_phrase_count,
        'recurring_topic_count': recurring_topic_count,
        'avg_escalation': round(avg_escalation, 1),
        'top_categories': top_categories,
        'top_triggers': top_triggers,
        'escalation_by_week': escalation_by_week,
        'sessions_by_week': sessions_by_week,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def weekly_summaries(request):
    """List weekly summaries for the authenticated user.

    Query params:
        page: page number (default 1)
        page_size: items per page (default 10, max 50)
    """
    user = request.user
    queryset = WeeklySummary.objects.filter(user=user)

    try:
        page = int(request.query_params.get('page', 1))
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = min(int(request.query_params.get('page_size', 10)), 50)
    except (ValueError, TypeError):
        page_size = 10
    start = (page - 1) * page_size
    end = start + page_size

    total = queryset.count()
    summaries = queryset[start:end]

    serializer = WeeklySummarySerializer(summaries, many=True)
    return Response({
        'count': total,
        'page': page,
        'page_size': page_size,
        'results': serializer.data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def latest_weekly_summary(request):
    """Get the most recent weekly summary for the authenticated user."""
    user = request.user

    summary = WeeklySummary.objects.filter(user=user).first()
    if not summary:
        return Response(
            {'detail': '주간 요약이 아직 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = WeeklySummarySerializer(summary)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_score(request):
    """Get current health score for the authenticated user.

    Query params:
        couple_id: optional couple UUID for couple-level score
    """
    user = request.user
    couple_id = request.query_params.get('couple_id')

    service = HealthScoreService()
    result = service.compute(user.id, couple_id=couple_id)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_score_history(request):
    """Get health score history for the authenticated user.

    Query params:
        days: number of days to look back (default 30, max 90)
    """
    user = request.user

    try:
        days = min(int(request.query_params.get('days', 30)), 90)
    except (ValueError, TypeError):
        days = 30

    cutoff = timezone.now().date() - timedelta(days=days)
    scores = DailyHealthScore.objects.filter(
        user=user,
        date__gte=cutoff,
    ).order_by('date').values('date', 'score', 'components')

    return Response({
        'days': days,
        'results': [
            {
                'date': s['date'].isoformat(),
                'score': s['score'],
                'components': s['components'],
            }
            for s in scores
        ],
    })
