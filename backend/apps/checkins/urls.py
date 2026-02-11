from django.urls import path
from .views import submit_checkin, today_checkin, streak_info, checkin_history, submit_detailed_checkin

urlpatterns = [
    path('', submit_checkin, name='checkins-submit'),
    path('detailed/', submit_detailed_checkin, name='checkins-detailed'),
    path('today/', today_checkin, name='checkins-today'),
    path('streak/', streak_info, name='checkins-streak'),
    path('history/', checkin_history, name='checkins-history'),
]
