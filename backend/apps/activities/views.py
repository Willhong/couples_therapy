"""Views for activities API."""

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.couples.models import Couple
from .models import Activity, CoupleActivity
from .serializers import ActivitySerializer, CoupleActivitySerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_list(request):
    """List active activities, optional ?category= filter."""
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

    category = request.query_params.get('category')
    queryset = Activity.objects.filter(is_active=True)

    if category:
        queryset = queryset.filter(category=category)

    serializer = ActivitySerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def featured_activities(request):
    """Get up to 3 featured activities."""
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

    activities = Activity.objects.filter(
        is_featured=True,
        is_active=True
    )[:3]

    serializer = ActivitySerializer(activities, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_activity(request, activity_id):
    """Start an activity (create CoupleActivity with status=in_progress)."""
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

    # Get activity
    try:
        activity = Activity.objects.get(id=activity_id, is_active=True)
    except Activity.DoesNotExist:
        return Response(
            {'detail': '활동을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Create couple activity
    couple_activity = CoupleActivity.objects.create(
        couple=couple,
        activity=activity,
        status='in_progress',
        started_at=timezone.now()
    )

    serializer = CoupleActivitySerializer(couple_activity)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_activity(request, activity_id):
    """Complete an activity (update status=completed, optional rating)."""
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

    # Get couple activity
    try:
        couple_activity = CoupleActivity.objects.get(
            couple=couple,
            activity_id=activity_id,
            status='in_progress'
        )
    except CoupleActivity.DoesNotExist:
        return Response(
            {'detail': '진행 중인 활동을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Update status
    couple_activity.status = 'completed'
    couple_activity.completed_at = timezone.now()

    # Optional rating
    rating = request.data.get('rating')
    if rating is not None:
        try:
            rating = int(rating)
            if 1 <= rating <= 5:
                couple_activity.rating = rating
        except (ValueError, TypeError):
            pass

    couple_activity.save()

    serializer = CoupleActivitySerializer(couple_activity)
    return Response(serializer.data)
