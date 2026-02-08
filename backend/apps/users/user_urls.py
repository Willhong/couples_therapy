"""User data management URL patterns (PIPA compliance)."""

from django.urls import path
from .views import user_data_export, user_data_deletion

urlpatterns = [
    path('me/data-export/', user_data_export, name='user_data_export'),
    path('me/', user_data_deletion, name='user_data_deletion'),
]
