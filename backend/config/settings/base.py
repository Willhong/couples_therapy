"""
Django settings for config project - Base Settings.

This file contains settings common to all environments.
"""

from pathlib import Path
from datetime import timedelta

import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Initialize environ
env = environ.Env(
    DEBUG=(bool, True),
    LLM_PROVIDER=(str, 'openai'),
    LLM_MAX_TOKENS=(int, 2048),
    LLM_TEMPERATURE=(float, 0.7),
)

# Read .env file
env.read_env(BASE_DIR / '.env')


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-xw=#kq-b4mvs%jj6e304#6g1dh_rhgs3d#bz-3m1i!&d0!=v_('

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = [
    # Daphne must be first for ASGI support
    'daphne',

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',

    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',  # Required by dj_rest_auth.registration
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'channels',
    'django_celery_beat',

    # Local apps
    'apps.users',
    'apps.couples',
    'apps.consents',
    'apps.core',
    'apps.onboarding',
    'apps.chat',
    'apps.audio',
    'apps.conversations',
    'apps.patterns',
]

SITE_ID = 1  # Required for django-allauth

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be high in list
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Custom User Model
AUTH_USER_MODEL = 'users.User'


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'ko-kr'

TIME_ZONE = 'Asia/Seoul'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/minute',
        'user': '100/minute',
        'auth': '5/minute',  # For login/token endpoints
    }
}


# Simple JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'TOKEN_OBTAIN_SERIALIZER': 'apps.users.serializers.EmailTokenObtainPairSerializer',
}


# dj-rest-auth settings
REST_AUTH = {
    'USE_JWT': True,
    'JWT_AUTH_HTTPONLY': False,  # Allow mobile app to receive refresh token
    'SESSION_LOGIN': False,  # Disable session auth for API
    'REGISTER_SERIALIZER': 'apps.users.serializers.CustomRegisterSerializer',
    'USER_DETAILS_SERIALIZER': 'apps.users.serializers.UserSerializer',  # Custom user serializer with tutorial_completed
    'TOKEN_MODEL': None,  # We're using JWT only, no database tokens
}


# django-allauth settings (email-based auth)
ACCOUNT_LOGIN_METHODS = {'email'}  # Use email for login
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']  # Required signup fields
ACCOUNT_EMAIL_VERIFICATION = 'optional'  # Set to 'mandatory' for production
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_USER_MODEL_USERNAME_FIELD = None  # No username field in custom User model


# Fernet encryption key for djfernet
# SECURITY WARNING: Generate a new key for production and keep it secret!
FERNET_KEYS = [
    'Tw6IKPg_AApN_RVtLWwmCGM20q3sUkURg7LwWvjClSA=',
]


# Channel layers configuration (overridden in development.py and production.py)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'
    }
}


# LLM Configuration (LangChain + LangGraph)
# Supported providers: "openai", "anthropic", "google", "openrouter"
LLM_PROVIDER = env('LLM_PROVIDER', default='openai')

# Model names per provider
LLM_MODELS = {
    'openai': {
        'chat': env('OPENAI_CHAT_MODEL', default='gpt-4o'),
        'summarization': env('OPENAI_SUMMARY_MODEL', default='gpt-4o-mini'),
    },
    'anthropic': {
        'chat': env('ANTHROPIC_CHAT_MODEL', default='claude-sonnet-4-5-20250929'),
        'summarization': env('ANTHROPIC_SUMMARY_MODEL', default='claude-haiku-3-5-20241022'),
    },
    'google': {
        'chat': env('GOOGLE_CHAT_MODEL', default='gemini-2.0-flash'),
        'summarization': env('GOOGLE_SUMMARY_MODEL', default='gemini-2.0-flash'),
    },
    'openrouter': {
        'chat': env('OPENROUTER_CHAT_MODEL', default='anthropic/claude-sonnet-4'),
        'summarization': env('OPENROUTER_SUMMARY_MODEL', default='anthropic/claude-haiku'),
    },
}

# LLM parameters
LLM_MAX_TOKENS = env.int('LLM_MAX_TOKENS', default=2048)
LLM_TEMPERATURE = env.float('LLM_TEMPERATURE', default=0.7)


# Celery Configuration (Redis broker on db 1, channels uses db 0)
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/1')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/1')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'


# OpenAI API Key (direct API for transcription, separate from LangChain)
OPENAI_API_KEY = env('OPENAI_API_KEY', default='')


# Media files (temporary audio storage)
MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_URL = '/media/'


# Audio recording limits
MAX_RECORDING_DURATION = 1800  # 30 minutes in seconds
MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024  # 25MB
