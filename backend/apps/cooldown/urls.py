"""URL routes for cool-down API."""

from django.urls import path

from .views import (
    start_cooldown,
    active_cooldown,
    complete_cooldown,
)

urlpatterns = [
    path('start/', start_cooldown, name='cooldown-start'),
    path('active/', active_cooldown, name='cooldown-active'),
    path('<uuid:cooldown_id>/complete/', complete_cooldown, name='cooldown-complete'),
]
