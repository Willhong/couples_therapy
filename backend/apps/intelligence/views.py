"""Views for intelligence (insight reports) API."""

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.couples.models import Couple
from .models import InsightReport
from .serializers import (
    InsightReportListSerializer,
    InsightReportDetailSerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_list(request):
    """List insight reports for the current user.

    Query params:
        status: filter by status (pending/processing/completed/failed)
        unread: if 'true', only unread reports
    """
    user = request.user
    qs = InsightReport.objects.filter(user=user)

    # Filters
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)

    unread = request.query_params.get('unread')
    if unread == 'true':
        qs = qs.filter(is_read=False, status='completed')

    serializer = InsightReportListSerializer(qs[:20], many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_detail(request, report_id):
    """Get detail of a specific insight report."""
    user = request.user

    try:
        report = InsightReport.objects.get(pk=report_id, user=user)
    except InsightReport.DoesNotExist:
        return Response(
            {'detail': '리포트를 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = InsightReportDetailSerializer(report)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_read(request, report_id):
    """Mark a report as read."""
    user = request.user

    try:
        report = InsightReport.objects.get(pk=report_id, user=user)
    except InsightReport.DoesNotExist:
        return Response(
            {'detail': '리포트를 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not report.is_read:
        report.is_read = True
        report.read_at = timezone.now()
        report.save(update_fields=['is_read', 'read_at'])

    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """Get count of unread completed reports."""
    count = InsightReport.objects.filter(
        user=request.user,
        is_read=False,
        status='completed',
    ).count()
    return Response({'unread_count': count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def partner_dashboard(request):
    """Partner dashboard: shared couple-level insights (E2).

    Returns partner mood trend, shared health score, recent activities,
    and insight summary - all respecting safety gates.
    """
    user = request.user

    couple = Couple.objects.filter(
        Q(user1=user) | Q(user2=user),
        status=Couple.Status.ACTIVE,
    ).first()

    if not couple:
        return Response(
            {'detail': '활성화된 커플이 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Determine partner
    partner = couple.user2 if couple.user1_id == user.id else couple.user1

    # Safety gate: check if couple features are enabled
    from apps.safety.models import SafetyAssessment
    latest_safety = SafetyAssessment.objects.filter(
        user=user,
    ).order_by('-created_at').first()

    if latest_safety and not latest_safety.couple_features_enabled:
        return Response(
            {'detail': '안전 평가에 따라 커플 기능이 비활성화되었습니다.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Build dashboard data
    data = _build_partner_dashboard(user, partner, couple)
    return Response(data)


def _build_partner_dashboard(user, partner, couple):
    """Build partner dashboard response data."""
    from datetime import timedelta
    from django.db.models import Avg

    from apps.checkins.models import DailyCheckIn
    from apps.activities.models import CoupleActivity

    now = timezone.now()
    week_ago = now - timedelta(days=7)

    # Partner mood trend (7d)
    partner_checkins = DailyCheckIn.objects.filter(
        user=partner,
        date__gte=week_ago.date(),
    ).order_by('date').values_list('mood', flat=True)

    partner_moods = list(partner_checkins)
    partner_avg_mood_7d = None
    partner_mood_trend = None

    if partner_moods:
        partner_avg_mood_7d = round(sum(partner_moods) / len(partner_moods), 1)
        if len(partner_moods) >= 3:
            mid = len(partner_moods) // 2
            first = sum(partner_moods[:mid]) / mid
            second = sum(partner_moods[mid:]) / (len(partner_moods) - mid)
            diff = second - first
            if diff > 0.3:
                partner_mood_trend = 'improving'
            elif diff < -0.3:
                partner_mood_trend = 'declining'
            else:
                partner_mood_trend = 'stable'

    # Shared health score
    shared_health_score = None
    try:
        from apps.patterns.models import DailyHealthScore
        latest = DailyHealthScore.objects.filter(
            user=user,
            couple=couple,
        ).order_by('-date').first()
        if latest:
            shared_health_score = latest.score
    except Exception:
        pass

    # Shared insight reports count
    shared_insights_count = InsightReport.objects.filter(
        couple=couple,
        status='completed',
    ).count()

    # Recent shared activities (last 14 days)
    recent_activities = list(
        CoupleActivity.objects.filter(
            couple=couple,
            status='completed',
            completed_at__gte=now - timedelta(days=14),
        ).select_related('activity').order_by('-completed_at')[:5].values(
            'activity__title', 'activity__category', 'rating', 'completed_at',
        )
    )
    recent_shared_activities = [
        {
            'title': a['activity__title'],
            'category': a['activity__category'],
            'rating': a['rating'],
            'completed_at': a['completed_at'].isoformat() if a['completed_at'] else None,
        }
        for a in recent_activities
    ]

    # Couple check-in streak
    couple_streak = None
    try:
        from apps.checkins.models import Streak
        user_streak = Streak.objects.filter(user=user).first()
        partner_streak = Streak.objects.filter(user=partner).first()
        if user_streak and partner_streak:
            couple_streak = {
                'user_current': user_streak.current_streak,
                'partner_current': partner_streak.current_streak,
                'combined': min(user_streak.current_streak, partner_streak.current_streak),
            }
    except Exception:
        pass

    # Partner display name
    partner_display_name = getattr(partner, 'display_name', None) or partner.email.split('@')[0]

    return {
        'partner_display_name': partner_display_name,
        'partner_mood_trend': partner_mood_trend,
        'partner_avg_mood_7d': partner_avg_mood_7d,
        'shared_health_score': shared_health_score,
        'shared_insights_count': shared_insights_count,
        'recent_shared_activities': recent_shared_activities,
        'couple_streak': couple_streak,
    }
