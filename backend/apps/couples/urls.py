"""URL patterns for couple and invite endpoints."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import InviteCodeViewSet, CoupleViewSet

router = DefaultRouter()
router.register(r'invite', InviteCodeViewSet, basename='invite')
router.register(r'', CoupleViewSet, basename='couple')

urlpatterns = [
    path('', include(router.urls)),
]
