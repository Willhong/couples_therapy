"""Views for checkins API."""

from datetime import date, timedelta
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.couples.models import Couple
from .models import DailyCheckIn, Streak
from .serializers import (
    DailyCheckInSerializer,
    StreakSerializer,
    CheckInCreateSerializer,
    DetailedCheckInCreateSerializer,
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_checkin(request):
    """Submit check-in for today.

    Body: {"mood": 1-5, "note": "..."}
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

    # Check if already checked in today
    if DailyCheckIn.objects.filter(user=user, date=today).exists():
        return Response(
            {'detail': '오늘 이미 체크인을 완료했습니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate request data
    serializer = CheckInCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Create check-in
    checkin = DailyCheckIn.objects.create(
        user=user,
        couple=couple,
        mood=serializer.validated_data['mood'],
        note=serializer.validated_data.get('note', ''),
        date=today
    )

    # Update streak
    streak, created = Streak.objects.get_or_create(
        user=user,
        defaults={'couple': couple}
    )

    yesterday = today - timedelta(days=1)

    if streak.last_checkin_date == yesterday:
        # Continue streak
        streak.current_streak += 1
    elif streak.last_checkin_date != today:
        # Start new streak
        streak.current_streak = 1

    # Update longest streak
    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak

    streak.last_checkin_date = today
    streak.save()

    checkin_serializer = DailyCheckInSerializer(checkin)
    return Response(checkin_serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def today_checkin(request):
    """Get today's check-in or 204 if none."""
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

    try:
        checkin = DailyCheckIn.objects.get(user=user, date=today)
        serializer = DailyCheckInSerializer(checkin)
        return Response(serializer.data)
    except DailyCheckIn.DoesNotExist:
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def streak_info(request):
    """Get streak data."""
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

    streak, created = Streak.objects.get_or_create(
        user=user,
        defaults={'couple': couple}
    )

    serializer = StreakSerializer(streak)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def checkin_history(request):
    """Get last 30 check-ins for the user."""
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

    checkins = DailyCheckIn.objects.filter(user=user).order_by('-date')[:30]
    serializer = DailyCheckInSerializer(checkins, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_detailed_checkin(request):
    """Submit detailed check-in with answers for today.

    Body: {"answers": ["answer1", "answer2", ...]}
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

    # Check if already checked in today
    if DailyCheckIn.objects.filter(user=user, date=today).exists():
        return Response(
            {'detail': '오늘 이미 체크인을 완료했습니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate request data
    serializer = DetailedCheckInCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Create check-in with answers (mood defaults to 3/보통 for detailed check-ins)
    checkin = DailyCheckIn.objects.create(
        user=user,
        couple=couple,
        mood=3,
        answers=serializer.validated_data['answers'],
        date=today
    )

    # Update streak
    streak, created = Streak.objects.get_or_create(
        user=user,
        defaults={'couple': couple}
    )

    yesterday = today - timedelta(days=1)

    if streak.last_checkin_date == yesterday:
        streak.current_streak += 1
    elif streak.last_checkin_date != today:
        streak.current_streak = 1

    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak

    streak.last_checkin_date = today
    streak.save()

    checkin_serializer = DailyCheckInSerializer(checkin)
    return Response(checkin_serializer.data, status=status.HTTP_201_CREATED)
