"""
URL configuration for config project.

API Version: v1
Base URL: /api/v1/
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # Auth endpoints (dj-rest-auth)
    path('api/v1/auth/', include('dj_rest_auth.urls')),
    path('api/v1/auth/registration/', include('dj_rest_auth.registration.urls')),

    # JWT token endpoints (simplejwt)
    path('api/v1/auth/token/', include('apps.users.urls')),

    # App endpoints
    path('api/v1/couples/', include('apps.couples.urls')),
]
