from django.urls import path
from .views import submit_checkin, today_checkin, streak_info, checkin_history

urlpatterns = [
    path('', submit_checkin, name='checkins-submit'),
    path('today/', today_checkin, name='checkins-today'),
    path('streak/', streak_info, name='checkins-streak'),
    path('history/', checkin_history, name='checkins-history'),
]
