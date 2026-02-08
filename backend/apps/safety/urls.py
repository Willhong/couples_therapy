"""URL routes for safety API."""

from django.urls import path

from .views import (
    assess_safety,
    safety_status,
    crisis_resources,
)

urlpatterns = [
    path('assess/', assess_safety, name='safety-assess'),
    path('status/', safety_status, name='safety-status'),
    path('resources/', crisis_resources, name='safety-resources'),
]
