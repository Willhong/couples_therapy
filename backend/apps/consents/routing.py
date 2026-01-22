"""WebSocket URL routing for consents app."""

from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/consent/$', consumers.ConsentConsumer.as_asgi()),
]
