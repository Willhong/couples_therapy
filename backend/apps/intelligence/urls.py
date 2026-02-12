from django.urls import path
from . import views

urlpatterns = [
    path('reports/', views.report_list, name='intelligence-reports'),
    path('reports/unread-count/', views.unread_count, name='intelligence-unread-count'),
    path('reports/<uuid:report_id>/', views.report_detail, name='intelligence-report-detail'),
    path('reports/<uuid:report_id>/read/', views.mark_read, name='intelligence-mark-read'),
    path('dashboard/', views.partner_dashboard, name='intelligence-dashboard'),
]
