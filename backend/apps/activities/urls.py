from django.urls import path
from .views import activity_list, featured_activities, start_activity, complete_activity

urlpatterns = [
    path('', activity_list, name='activities-list'),
    path('featured/', featured_activities, name='activities-featured'),
    path('<int:activity_id>/start/', start_activity, name='activities-start'),
    path('<int:activity_id>/complete/', complete_activity, name='activities-complete'),
]
