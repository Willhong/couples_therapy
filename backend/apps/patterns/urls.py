"""URL configuration for patterns API."""

from django.urls import path

from . import views

urlpatterns = [
    path('', views.pattern_list, name='pattern-list'),
    path('session/<uuid:conversation_id>/', views.session_insights, name='session-insights'),
    path('dashboard/', views.insights_dashboard, name='insights-dashboard'),
    path('weekly/', views.weekly_summaries, name='weekly-summaries'),
    path('weekly/latest/', views.latest_weekly_summary, name='latest-weekly-summary'),
]
