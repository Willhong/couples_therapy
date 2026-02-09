"""
Django settings for testing (CI and local test runs).

Uses DATABASE_URL when available (CI with PostgreSQL), falls back to SQLite.
"""

from .base import *

DEBUG = False
ALLOWED_HOSTS = ['*']

# Database: use DATABASE_URL if set (CI/PostgreSQL), otherwise SQLite
DATABASES = {
    'default': env.db('DATABASE_URL', default='sqlite:///tmp/test_couplesai.db')
}

# Faster password hashing for tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# In-memory channel layer for tests
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'
    }
}

# Run Celery tasks synchronously
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Console email backend
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
