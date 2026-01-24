"""URL routes for chat API."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from .views import (
    ConversationViewSet,
    MessageViewSet,
    SharedReframingViewSet,
    llm_info,
    reframe_message,
    save_reframing,
    stream_reframe,
)

# Main router for top-level resources
router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'shared', SharedReframingViewSet, basename='shared-reframing')

# Nested router for messages within conversations
conversations_router = routers.NestedDefaultRouter(router, r'conversations', lookup='conversation')
conversations_router.register(r'messages', MessageViewSet, basename='conversation-messages')

urlpatterns = [
    # LLM/Reframing endpoints
    path('llm-info/', llm_info, name='llm-info'),
    path('reframe/', reframe_message, name='reframe-message'),
    path('save-reframing/', save_reframing, name='save-reframing'),
    path('stream-reframe/', stream_reframe, name='stream-reframe'),

    # Router URLs
    path('', include(router.urls)),
    path('', include(conversations_router.urls)),
]
