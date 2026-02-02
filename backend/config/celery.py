"""Celery configuration for async task processing.

Uses Redis as broker (db 1, separate from channels which uses db 0).
Auto-discovers tasks from all installed apps.
"""

import os

from celery import Celery
from celery.schedules import crontab

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')

app = Celery('config')

# Load config from Django settings, using CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# Beat schedule for periodic tasks
app.conf.beat_schedule = {
    'weekly-pattern-summary': {
        'task': 'apps.audio.tasks.generate_weekly_pattern_summary',
        'schedule': crontab(
            hour=9,
            minute=0,
            day_of_week=1,  # Monday
        ),
        'options': {'timezone': 'Asia/Seoul'},
    },
}
app.conf.timezone = 'Asia/Seoul'
