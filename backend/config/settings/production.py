"""
Django settings for production environment.

All secrets MUST be provided via environment variables.
No defaults for critical security values.
"""

from .base import *

import environ

env = environ.Env()

# Security
SECRET_KEY = env('DJANGO_SECRET_KEY')  # No default - must be set
FERNET_KEYS = env.list('FERNET_KEYS')  # No default - must be set
DEBUG = False
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

# HTTPS / Security Headers
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_REFERRER_POLICY = 'same-origin'

# CORS
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])

# Static files
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

# Database (PostgreSQL required)
DATABASES = {
    'default': env.db('DATABASE_URL')  # No default - must be set
}

# Redis channel layer
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [env('REDIS_URL', default='redis://localhost:6379/0')],
        },
    }
}

# Celery (async, not eager)
CELERY_TASK_ALWAYS_EAGER = False

# Cache Configuration (Redis for production)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://localhost:6379/2'),
    }
}

# Email
ACCOUNT_EMAIL_VERIFICATION = 'optional'  # Keep optional until SMTP is configured

# Structured logging (JSON to stdout for Docker)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {'level': 'WARNING'},
        'apps': {'level': 'INFO'},
        'celery': {'level': 'INFO'},
    },
}

# Sentry error tracking
import sentry_sdk
SENTRY_DSN = env('SENTRY_DSN', default='')
if SENTRY_DSN:
    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1)
