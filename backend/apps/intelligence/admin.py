from django.contrib import admin
from .models import InsightReport


@admin.register(InsightReport)
class InsightReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'trigger_tier', 'status', 'created_at']
    list_filter = ['trigger_tier', 'status', 'created_at']
    search_fields = ['user__email', 'report_title']
    readonly_fields = ['id', 'created_at']
