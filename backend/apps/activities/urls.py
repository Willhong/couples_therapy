from django.urls import path
from .views import (
    activity_list, featured_activities, start_activity, complete_activity,
    recommendations, effectiveness,
)

urlpatterns = [
    path('', activity_list, name='activities-list'),
    path('featured/', featured_activities, name='activities-featured'),
    path('recommendations/', recommendations, name='activities-recommendations'),
    path('effectiveness/', effectiveness, name='activities-effectiveness'),
    path('<int:activity_id>/start/', start_activity, name='activities-start'),
    path('<int:activity_id>/complete/', complete_activity, name='activities-complete'),
]
