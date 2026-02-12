"""
URL configuration for config project.

API Version: v1
Base URL: /api/v1/
"""

from django.contrib import admin
from django.urls import path, include

from apps.core.health import liveness, readiness
from apps.core import views as core_views

urlpatterns = [
    # Health checks (unauthenticated)
    path('health/', liveness),
    path('health/ready/', readiness),

    # Public pages (App Store compliance)
    path('privacy-policy/', core_views.privacy_policy, name='privacy-policy'),
    path('terms/', core_views.terms_of_service, name='terms'),

    # Admin
    path('admin/', admin.site.urls),

    # Auth endpoints (dj-rest-auth)
    path('api/v1/auth/', include('dj_rest_auth.urls')),
    path('api/v1/auth/registration/', include('dj_rest_auth.registration.urls')),

    # JWT token endpoints (simplejwt)
    path('api/v1/auth/token/', include('apps.users.urls')),

    # User data management (PIPA compliance)
    path('api/v1/users/', include('apps.users.user_urls')),

    # App endpoints
    path('api/v1/couples/', include('apps.couples.urls')),
    path('api/v1/consents/', include('apps.consents.urls')),
    path('api/v1/onboarding/', include('apps.onboarding.urls')),
    path('api/v1/chat/', include('apps.chat.urls')),
    path('api/v1/audio/', include('apps.audio.urls')),
    path('api/v1/conversations/', include('apps.conversations.urls')),
    path('api/v1/patterns/', include('apps.patterns.urls')),
    path('api/v1/cooldown/', include('apps.cooldown.urls')),
    path('api/v1/prompts/', include('apps.prompts.urls')),
    path('api/v1/safety/', include('apps.safety.urls')),
    path('api/v1/checkins/', include('apps.checkins.urls')),
    path('api/v1/activities/', include('apps.activities.urls')),
    path('api/v1/intelligence/', include('apps.intelligence.urls')),
]
