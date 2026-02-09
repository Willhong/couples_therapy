"""Expo Push Notification service.

Sends push notifications via Expo Push API.
All notification text is in Korean.
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


# Notification messages in Korean
NOTIFICATION_MESSAGES = {
    'consent_request': {
        'title': '녹음 동의 요청',
        'body': '파트너가 대화 녹음을 요청했습니다.',
    },
    'daily_prompt': {
        'title': '오늘의 대화 주제',
        'body': '오늘의 커플 대화 주제가 준비되었습니다.',
    },
    'cooldown_complete': {
        'title': '쿨다운 완료',
        'body': '쿨다운 시간이 끝났습니다. 대화할 준비가 되셨나요?',
    },
    'shared_reframing': {
        'title': '파트너 공유',
        'body': '파트너가 리프레이밍을 공유했습니다.',
    },
    'weekly_insight': {
        'title': '주간 인사이트',
        'body': '이번 주 대화 패턴 분석이 준비되었습니다.',
    },
}


def send_push_notification(push_token: str, notification_type: str, data: dict = None):
    """Send a push notification via Expo Push API.

    Args:
        push_token: Expo push token (ExponentPushToken[...])
        notification_type: Key from NOTIFICATION_MESSAGES
        data: Optional data payload for deep linking
    """
    if not push_token:
        logger.warning("No push token provided, skipping notification")
        return False

    message_config = NOTIFICATION_MESSAGES.get(notification_type)
    if not message_config:
        logger.error(f"Unknown notification type: {notification_type}")
        return False

    try:
        from exponent_server_sdk import (
            DeviceNotRegisteredError,
            PushClient,
            PushMessage,
            PushServerError,
        )

        push_message = PushMessage(
            to=push_token,
            title=message_config['title'],
            body=message_config['body'],
            data=data or {},
            sound='default',
        )

        response = PushClient().publish(push_message)
        response.validate_response()
        logger.info(f"Push notification sent: {notification_type} to {push_token[:20]}...")
        return True

    except DeviceNotRegisteredError:
        logger.warning(f"Device not registered, clearing token: {push_token[:20]}...")
        _clear_push_token(push_token)
        return False
    except PushServerError as e:
        logger.error(f"Push server error: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
        return False


def _clear_push_token(push_token: str):
    """Remove an invalid push token from user records."""
    from apps.users.models import User
    User.objects.filter(expo_push_token=push_token).update(expo_push_token='')


@shared_task
def send_push_notification_task(user_id: int, notification_type: str, data: dict = None):
    """Celery task wrapper for async push notification sending."""
    from apps.users.models import User

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for push notification")
        return

    if not user.expo_push_token:
        logger.debug(f"User {user_id} has no push token, skipping")
        return

    send_push_notification(user.expo_push_token, notification_type, data)


@shared_task
def send_partner_notification_task(user_id: int, notification_type: str, data: dict = None):
    """Send push notification to user's partner."""
    from apps.users.models import User
    from apps.couples.models import Couple
    from django.db import models

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    couple = Couple.objects.filter(
        (models.Q(user1=user) | models.Q(user2=user)),
        status=Couple.Status.ACTIVE
    ).first()

    if not couple:
        return

    partner = couple.user2 if couple.user1 == user else couple.user1

    if partner.expo_push_token:
        send_push_notification(partner.expo_push_token, notification_type, data)
