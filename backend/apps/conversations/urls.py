"""URL routes for unified conversations API."""

from django.urls import path
from .views import unified_list

urlpatterns = [
    path('', unified_list, name='unified-conversation-list'),
]
