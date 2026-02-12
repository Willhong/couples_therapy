"""User data management URL patterns (PIPA compliance)."""

from django.urls import path
from .views import (
    user_data_export,
    user_data_deletion,
    register_push_token,
    unregister_push_token,
    notification_preferences,
)

urlpatterns = [
    path('me/data-export/', user_data_export, name='user_data_export'),
    path('me/', user_data_deletion, name='user_data_deletion'),
    path('me/notification-preferences/', notification_preferences, name='notification-preferences'),
    path('push-token/', register_push_token, name='register-push-token'),
    path('push-token/unregister/', unregister_push_token, name='unregister-push-token'),
]
