"""User views for data export and deletion (PIPA compliance)."""

import uuid
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction

from .models import User
from .serializers import UserSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_data_export(request):
    """Export user's personal data (PIPA Article 35 - Right to Access).

    Returns JSON with:
    - Profile data (email, name, onboarding status)
    - Conversation titles (not message content - encrypted)
    - Couple status

    Does NOT include:
    - Message content (encrypted, sensitive)
    - Partner's personal data
    """
    user = request.user

    # Basic profile data
    profile_data = UserSerializer(user).data

    # Conversation metadata (titles only, no message content)
    conversations = []
    for conv in user.conversations.all():
        conversations.append({
            'id': str(conv.id),
            'title': conv.title,
            'type': conv.conversation_type,
            'created_at': conv.created_at.isoformat(),
            'updated_at': conv.updated_at.isoformat(),
        })

    # Couple status (not partner's data)
    couple_status = None
    couple = user.couple_as_user1.filter(status='active').first() or \
            user.couple_as_user2.filter(status='active').first()
    if couple:
        couple_status = {
            'status': couple.status,
            'connected_at': couple.connected_at.isoformat() if couple.connected_at else None,
        }

    export_data = {
        'profile': profile_data,
        'conversations': conversations,
        'couple_status': couple_status,
        'export_timestamp': user.date_joined.isoformat(),
    }

    return Response(export_data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def user_data_deletion(request):
    """Delete user account and associated data (PIPA Article 36 - Right to Deletion).

    Actions:
    - Anonymize user data (email, name)
    - Delete conversations, messages, recordings
    - Delete couple links
    - Mark user as inactive

    Returns 204 No Content on success.
    """
    user = request.user

    with transaction.atomic():
        # Delete related data
        # Conversations and messages cascade delete automatically
        user.conversations.all().delete()

        # Delete couple relationships
        user.couple_as_user1.all().delete()
        user.couple_as_user2.all().delete()

        # Delete invite codes
        user.created_invite_codes.all().delete()
        user.used_invite_codes.all().update(used_by=None)

        # Delete shared reframings
        user.shared_reframings.all().delete()
        user.received_reframings.all().delete()

        # Anonymize user data
        anonymous_id = uuid.uuid4().hex[:8]
        user.email = f'deleted_{anonymous_id}@anonymized.com'
        user.first_name = ''
        user.last_name = ''
        user.is_active = False
        user.save()

    return Response(status=status.HTTP_204_NO_CONTENT)
