"""Views for the unified conversation list."""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.chat.models import Conversation
from .serializers import UnifiedConversationSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unified_list(request):
    """Return a unified, paginated list of all conversations.

    Merges text chats and audio recordings into a single
    chronological feed ordered by most recently updated.

    Query params:
        page: Page number (default 1)
        page_size: Items per page (default 20, max 50)

    Returns:
        results: List of UnifiedConversationSerializer items
        count: Total number of conversations
        next: Next page number or null
        previous: Previous page number or null
    """
    user = request.user
    queryset = Conversation.objects.filter(
        user=user,
    ).select_related('couple').order_by('-updated_at')

    # Simple page-number pagination
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (ValueError, TypeError):
        page = 1

    try:
        page_size = min(50, max(1, int(request.query_params.get('page_size', 20))))
    except (ValueError, TypeError):
        page_size = 20

    total = queryset.count()
    start = (page - 1) * page_size
    end = start + page_size
    conversations = queryset[start:end]

    serializer = UnifiedConversationSerializer(conversations, many=True)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return Response({
        'results': serializer.data,
        'count': total,
        'next': page + 1 if page < total_pages else None,
        'previous': page - 1 if page > 1 else None,
    })
