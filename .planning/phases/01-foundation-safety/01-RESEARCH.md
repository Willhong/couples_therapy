# Phase 1: Foundation & Safety - Research

**Researched:** 2026-01-23
**Domain:** Django Backend Authentication, Partner Connection, Data Encryption, Real-time WebSocket
**Confidence:** HIGH

---

## Summary

Phase 1 establishes secure authentication, partner linking, and legal safeguards for a couples therapy app using **Django 5.x + Django REST Framework** backend with **Expo** mobile frontend. This research replaces the previous Supabase-based approach.

Key findings:
- **djangorestframework-simplejwt** provides production-ready JWT authentication with token rotation and blacklisting for mobile apps
- **Django Channels + Redis** enables real-time WebSocket for dual consent synchronization
- **django-cryptography** or **djfernet** provides transparent AES-256 field encryption for sensitive data
- **dj-rest-auth** simplifies registration/login API endpoints with email verification support
- **expo-secure-store** securely stores JWT tokens on device using iOS Keychain / Android Keystore

**Primary recommendation:** Use djangorestframework-simplejwt with 30-minute access tokens and 7-day refresh tokens (with rotation and blacklisting). Implement Django Channels with Redis channel layer for real-time consent synchronization. Use djfernet for encrypting sensitive model fields at the database level.

---

## Standard Stack

### Core Backend

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Django** | 5.x | Web framework | User's confirmed choice, mature ecosystem, excellent ORM |
| **djangorestframework** | 3.15+ | REST API | De-facto standard for Django APIs, excellent serialization |
| **djangorestframework-simplejwt** | 5.3+ | JWT authentication | Jazzband maintained, token rotation, blacklist support, mobile-optimized |
| **dj-rest-auth** | 6.0+ | Auth endpoints | Complete registration/login/password-reset endpoints out of box |
| **django-allauth** | 0.61+ | Account management | Required by dj-rest-auth, handles email verification |
| **Django Channels** | 4.3+ | WebSocket/async | Official Django project, ASGI support |
| **channels-redis** | 4.2+ | Channel layer | Official Redis backend for Channels, production-ready |

### Database & Encryption

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **PostgreSQL** | 15+ | Database | User's confirmed choice, excellent JSON support, ACID compliance |
| **psycopg** | 3.x | DB adapter | Modern async-capable PostgreSQL adapter |
| **djfernet** | 0.9+ | Field encryption | AES-128-CBC + HMAC-SHA256, transparent encryption, key rotation support |

### Deployment

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Daphne** | 4.1+ | ASGI server | Official Channels server, HTTP/WebSocket protocol negotiation |
| **Redis** | 7.x | Channel layer + cache | Required for Channels in production, also useful for caching |
| **gunicorn** | 22+ | WSGI server (optional) | For HTTP-only endpoints if splitting traffic |

### Mobile (Frontend - unchanged)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **expo-secure-store** | SDK 53+ | JWT token storage | Hardware-backed encryption (iOS Keychain, Android Keystore) |
| **expo-linking** | SDK 53+ | Deep linking | Partner invite links |
| **react-native-copilot** | 3.x+ | Coach mark tutorial | Expo compatible, SVG overlay |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| simplejwt | django-rest-knox | Knox stores tokens in DB (more control but less stateless) |
| dj-rest-auth | djoser | Djoser is lighter but requires more manual setup for email verification |
| djfernet | django-cryptography | django-cryptography uses same Fernet but djfernet has better maintained Django 5 support |
| Django Channels | Pusher/Firebase | Third-party services add latency and cost; Channels is self-hosted |

**Installation:**
```bash
# Backend dependencies
pip install django djangorestframework djangorestframework-simplejwt
pip install dj-rest-auth[with_social] django-allauth
pip install channels channels-redis daphne
pip install djfernet psycopg[binary]

# Or in requirements.txt
Django>=5.0,<6.0
djangorestframework>=3.15
djangorestframework-simplejwt>=5.3
dj-rest-auth[with_social]>=6.0
django-allauth>=0.61
channels>=4.3
channels-redis>=4.2
daphne>=4.1
djfernet>=0.9
psycopg[binary]>=3.1
redis>=5.0
```

---

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── config/
│   ├── settings/
│   │   ├── base.py          # Common settings
│   │   ├── development.py   # Dev settings
│   │   └── production.py    # Production settings
│   ├── asgi.py              # ASGI application with Channels routing
│   ├── urls.py              # Root URL configuration
│   └── wsgi.py              # WSGI application (optional)
├── apps/
│   ├── users/
│   │   ├── models.py        # Custom User model
│   │   ├── serializers.py   # User serializers
│   │   ├── views.py         # Custom auth views (if needed)
│   │   └── urls.py
│   ├── couples/
│   │   ├── models.py        # Couple, InviteCode models
│   │   ├── serializers.py
│   │   ├── views.py         # Partner linking endpoints
│   │   └── urls.py
│   ├── consents/
│   │   ├── models.py        # RecordingConsent, DisclaimerConsent
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── consumers.py     # WebSocket consumer for consent sync
│   │   └── routing.py       # WebSocket URL routing
│   └── core/
│       ├── middleware.py    # Custom middleware
│       └── permissions.py   # Custom DRF permissions
├── manage.py
└── requirements.txt
```

### Pattern 1: JWT Authentication Configuration

**What:** Configure simplejwt for mobile app authentication with token rotation
**When to use:** Always for mobile app backends

```python
# config/settings/base.py
from datetime import timedelta

INSTALLED_APPS = [
    'daphne',  # Must be before django.contrib.staticfiles
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
    'rest_framework_simplejwt.token_blacklist',  # Enable blacklist
    'corsheaders',
    'allauth',
    'allauth.account',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'channels',

    # Local apps
    'apps.users',
    'apps.couples',
    'apps.consents',
]

SITE_ID = 1  # Required for django-allauth

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

    'TOKEN_OBTAIN_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenObtainPairSerializer',
}

# dj-rest-auth settings
REST_AUTH = {
    'USE_JWT': True,
    'JWT_AUTH_HTTPONLY': False,  # Allow mobile app to receive refresh token
    'SESSION_LOGIN': False,  # Disable session auth for API
    'REGISTER_SERIALIZER': 'apps.users.serializers.CustomRegisterSerializer',
}

# django-allauth settings (email-based auth)
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'  # or 'optional' for development
ACCOUNT_UNIQUE_EMAIL = True
```

### Pattern 2: Custom User Model with Encrypted Fields

**What:** Custom User model with disclaimer consent tracking and encrypted sensitive data
**When to use:** Foundation of the authentication system

```python
# apps/users/models.py
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from djfernet.fields import EncryptedCharField

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    username = None  # Remove username field
    email = models.EmailField('email address', unique=True)

    # Disclaimer consent tracking (SAFE-04)
    disclaimer_accepted = models.BooleanField(default=False)
    disclaimer_accepted_at = models.DateTimeField(null=True, blank=True)
    disclaimer_version = models.CharField(max_length=10, blank=True)

    # Onboarding progress
    onboarding_completed = models.BooleanField(default=False)
    tutorial_completed = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'users'

# settings.py
AUTH_USER_MODEL = 'users.User'
```

### Pattern 3: Partner Invite Code System

**What:** Database model and API for 6-digit invite codes with 24-hour expiration
**When to use:** Partner connection feature (AUTH-03, AUTH-04)

```python
# apps/couples/models.py
import secrets
import string
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

def generate_invite_code():
    """Generate 6-character alphanumeric code (excluding confusing chars)"""
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # No 0, O, 1, I
    return ''.join(secrets.choice(chars) for _ in range(6))

class Couple(models.Model):
    """Represents a linked couple relationship"""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'
        DISCONNECTED = 'disconnected', 'Disconnected'

    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='couple_as_user1'
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='couple_as_user2',
        null=True, blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    connected_at = models.DateTimeField(null=True, blank=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'couples'
        constraints = [
            models.CheckConstraint(
                check=~models.Q(user1=models.F('user2')),
                name='cannot_couple_with_self'
            )
        ]

    def get_partner(self, user):
        """Get the partner of the given user in this couple"""
        if user == self.user1:
            return self.user2
        elif user == self.user2:
            return self.user1
        return None

class InviteCode(models.Model):
    """Partner invitation code with 24-hour expiration"""

    code = models.CharField(max_length=6, unique=True, default=generate_invite_code)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_invite_codes'
    )
    couple = models.ForeignKey(
        Couple,
        on_delete=models.CASCADE,
        related_name='invite_codes'
    )
    expires_at = models.DateTimeField()
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='used_invite_codes'
    )
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invite_codes'
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['expires_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        return (
            self.used_by is None and
            self.expires_at > timezone.now()
        )

    @classmethod
    def create_for_user(cls, user):
        """Create a new invite code for a user, creating couple if needed"""
        # Check if user already has an active couple
        existing_couple = Couple.objects.filter(
            models.Q(user1=user) | models.Q(user2=user),
            status=Couple.Status.ACTIVE
        ).first()

        if existing_couple:
            raise ValueError("User already in an active couple")

        # Create or get pending couple
        couple, _ = Couple.objects.get_or_create(
            user1=user,
            status=Couple.Status.PENDING
        )

        # Invalidate any existing codes
        cls.objects.filter(creator=user, used_by__isnull=True).update(
            expires_at=timezone.now()
        )

        # Create new code
        return cls.objects.create(creator=user, couple=couple)
```

### Pattern 4: Consent Models with Encryption

**What:** Recording consent and disclaimer consent tracking with encrypted storage
**When to use:** SAFE-01 (dual consent), SAFE-03 (encryption), SAFE-04 (disclaimer)

```python
# apps/consents/models.py
from django.db import models
from django.conf import settings
from djfernet.fields import EncryptedTextField

class RecordingConsent(models.Model):
    """Tracks dual consent for recording sessions (SAFE-01)"""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        BOTH_CONSENTED = 'both_consented', 'Both Consented'
        DECLINED = 'declined', 'Declined'
        EXPIRED = 'expired', 'Expired'

    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.CASCADE,
        related_name='recording_consents'
    )
    session_id = models.UUIDField(unique=True)  # Unique identifier for consent session

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consent_requests_made'
    )
    requester_consented = models.BooleanField(default=True)
    requester_consented_at = models.DateTimeField(auto_now_add=True)

    responder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consent_requests_received',
        null=True
    )
    responder_consented = models.BooleanField(null=True)
    responder_consented_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    # IP addresses encrypted for privacy (optional audit trail)
    requester_ip = EncryptedTextField(blank=True, null=True)
    responder_ip = EncryptedTextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # Consent request expires after X minutes

    class Meta:
        db_table = 'recording_consents'
        ordering = ['-created_at']

    def process_response(self, user, consented: bool, ip_address: str = None):
        """Process consent response from partner"""
        if user != self.responder:
            raise ValueError("Only responder can respond to consent")

        self.responder_consented = consented
        self.responder_consented_at = timezone.now()
        self.responder_ip = ip_address

        if consented and self.requester_consented:
            self.status = self.Status.BOTH_CONSENTED
        else:
            self.status = self.Status.DECLINED

        self.save()
        return self.status


class DisclaimerConsent(models.Model):
    """Tracks disclaimer acknowledgment (SAFE-04)"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='disclaimer_consents'
    )
    version = models.CharField(max_length=10)  # e.g., "1.0", "1.1"
    content_hash = models.CharField(max_length=64)  # SHA-256 of disclaimer text
    consented_at = models.DateTimeField(auto_now_add=True)
    ip_address = EncryptedTextField(blank=True, null=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = 'disclaimer_consents'
        unique_together = ['user', 'version']
```

### Pattern 5: WebSocket Consumer for Real-time Consent

**What:** Django Channels consumer for real-time consent synchronization
**When to use:** Dual consent recording feature (SAFE-01)

```python
# apps/consents/consumers.py
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import RecordingConsent

class ConsentConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for real-time consent synchronization"""

    async def connect(self):
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Get user's active couple
        self.couple = await self.get_active_couple()
        if not self.couple:
            await self.close(code=4002)
            return

        # Join couple-specific group
        self.room_group_name = f'consent_{self.couple.id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Notify partner of presence
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': self.user.id,
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_left',
                    'user_id': self.user.id,
                }
            )
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive_json(self, content):
        action = content.get('action')

        if action == 'request_consent':
            await self.handle_consent_request(content)
        elif action == 'respond_consent':
            await self.handle_consent_response(content)
        elif action == 'withdraw_consent':
            await self.handle_consent_withdrawal(content)

    async def handle_consent_request(self, content):
        """Handle new consent request from requester"""
        session_id = content.get('session_id')

        consent = await self.create_consent_request(session_id)

        # Broadcast to partner
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'consent_requested',
                'session_id': str(consent.session_id),
                'requester_id': self.user.id,
                'expires_at': consent.expires_at.isoformat(),
            }
        )

    async def handle_consent_response(self, content):
        """Handle consent response from responder"""
        session_id = content.get('session_id')
        consented = content.get('consented', False)

        status = await self.process_consent_response(session_id, consented)

        # Broadcast result to both partners
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'consent_updated',
                'session_id': session_id,
                'responder_id': self.user.id,
                'consented': consented,
                'status': status,
            }
        )

    # Event handlers (called by group_send)
    async def consent_requested(self, event):
        await self.send_json(event)

    async def consent_updated(self, event):
        await self.send_json(event)

    async def user_joined(self, event):
        await self.send_json(event)

    async def user_left(self, event):
        await self.send_json(event)

    @database_sync_to_async
    def get_active_couple(self):
        from apps.couples.models import Couple
        return Couple.objects.filter(
            models.Q(user1=self.user) | models.Q(user2=self.user),
            status=Couple.Status.ACTIVE
        ).first()

    @database_sync_to_async
    def create_consent_request(self, session_id):
        import uuid
        partner = self.couple.get_partner(self.user)
        return RecordingConsent.objects.create(
            couple=self.couple,
            session_id=uuid.UUID(session_id),
            requester=self.user,
            responder=partner,
            expires_at=timezone.now() + timezone.timedelta(minutes=5)
        )

    @database_sync_to_async
    def process_consent_response(self, session_id, consented):
        consent = RecordingConsent.objects.get(session_id=session_id)
        consent.process_response(self.user, consented)
        return consent.status
```

```python
# apps/consents/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/consent/$', consumers.ConsentConsumer.as_asgi()),
]
```

### Pattern 6: JWT Authentication Middleware for Channels

**What:** Custom middleware to authenticate WebSocket connections using JWT
**When to use:** All WebSocket connections

```python
# apps/core/middleware.py
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token_string):
    try:
        token = AccessToken(token_string)
        user_id = token.payload.get('user_id')
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware for JWT authentication in WebSocket connections.
    Token is passed via query string: ws://.../?token=<jwt_token>
    """

    async def __call__(self, scope, receive, send):
        # Get token from query string
        query_string = scope.get('query_string', b'').decode()
        query_params = dict(
            param.split('=') for param in query_string.split('&') if '=' in param
        )
        token = query_params.get('token')

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    """Convenience function to wrap with JWT auth middleware"""
    return JWTAuthMiddleware(inner)
```

```python
# config/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

django_asgi_app = get_asgi_application()

# Import after Django setup
from apps.core.middleware import JWTAuthMiddlewareStack
from apps.consents import routing as consent_routing

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        JWTAuthMiddlewareStack(
            URLRouter(
                consent_routing.websocket_urlpatterns
            )
        )
    ),
})
```

### Pattern 7: API Endpoints Structure

**What:** RESTful API endpoint design for mobile app
**When to use:** All API communications

```python
# config/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth endpoints (dj-rest-auth)
    path('api/v1/auth/', include('dj_rest_auth.urls')),
    path('api/v1/auth/registration/', include('dj_rest_auth.registration.urls')),

    # JWT token endpoints
    path('api/v1/auth/token/', include('apps.users.urls')),

    # App endpoints
    path('api/v1/couples/', include('apps.couples.urls')),
    path('api/v1/consents/', include('apps.consents.urls')),
]
```

```python
# apps/users/urls.py
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    path('', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('verify/', TokenVerifyView.as_view(), name='token_verify'),
]
```

### Anti-Patterns to Avoid

- **Storing JWT tokens in localStorage/AsyncStorage:** Unencrypted, accessible to anyone with device access. Always use expo-secure-store.
- **Long access token lifetimes:** Access tokens should be 15-30 minutes max. Use refresh tokens for longer sessions.
- **Not enabling token blacklist:** Without blacklist, rotated tokens remain valid until expiry.
- **Synchronous ORM calls in async consumers:** Use `database_sync_to_async` decorator or async ORM methods.
- **Sending JWT in WebSocket headers:** WebSocket API doesn't support custom headers. Use query string for initial auth.
- **Not throttling auth endpoints:** Login/token endpoints are attack targets. Rate limit aggressively.

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT token management | Custom token logic | djangorestframework-simplejwt | Handles rotation, blacklist, refresh, claims, all edge cases |
| User registration API | Custom registration views | dj-rest-auth | Email verification, password reset, standardized endpoints |
| WebSocket auth | Custom auth protocol | JWTAuthMiddleware + Channels | Battle-tested patterns, proper async handling |
| Field encryption | Custom AES wrapper | djfernet / django-cryptography | Key rotation, proper HMAC, transparent ORM integration |
| Partner invite codes | Simple random strings | Database unique + retry | Collision handling, expiration, audit trail |
| Real-time sync | Polling | Django Channels + Redis | Sub-second latency, proper connection management |

**Key insight:** Security features (JWT management, encryption, auth flows) must be handled by battle-tested libraries. Custom implementations invariably have edge cases that lead to vulnerabilities.

---

## Common Pitfalls

### Pitfall 1: JWT Token Not Refreshing on Mobile

**What goes wrong:** App logs out user unexpectedly when access token expires
**Why it happens:** Mobile app doesn't implement token refresh before API calls
**How to avoid:** Implement axios/fetch interceptor that checks token expiry and refreshes
**Warning signs:** Users complaining about being logged out after 30 minutes

```typescript
// Mobile-side solution (Expo/React Native)
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({ baseURL: API_URL });

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, {
          refresh: refreshToken
        });
        await SecureStore.setItemAsync('accessToken', data.access);
        if (data.refresh) {
          await SecureStore.setItemAsync('refreshToken', data.refresh);
        }
        // Retry original request
        error.config.headers.Authorization = `Bearer ${data.access}`;
        return api.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);
```

### Pitfall 2: WebSocket Connection Lost Without Reconnection

**What goes wrong:** Real-time consent sync stops working, users don't know
**Why it happens:** Network changes, app backgrounding kills WebSocket
**How to avoid:** Implement reconnection logic with exponential backoff
**Warning signs:** Consent updates not appearing in real-time

### Pitfall 3: Channels Redis Not Configured for Production

**What goes wrong:** WebSocket works locally but fails in production
**Why it happens:** Using InMemoryChannelLayer (dev only) instead of Redis
**How to avoid:** Always use `channels_redis.core.RedisChannelLayer` in production
**Warning signs:** "Channel layer does not support groups" errors

### Pitfall 4: Token Blacklist Table Not Migrated

**What goes wrong:** Token rotation works but old tokens remain valid
**Why it happens:** Forgot to add `rest_framework_simplejwt.token_blacklist` to INSTALLED_APPS and run migrations
**How to avoid:** Add to INSTALLED_APPS immediately when setting up simplejwt
**Warning signs:** Logging out doesn't invalidate tokens

### Pitfall 5: Encryption Key Not Rotated

**What goes wrong:** Compromised key means all historical data exposed
**Why it happens:** Using single FERNET_KEY without rotation strategy
**How to avoid:** Use FERNET_KEYS list, add new keys to front, keep old keys for decryption
**Warning signs:** No key rotation procedure documented

### Pitfall 6: Missing CORS Configuration

**What goes wrong:** Mobile app can't reach API in development
**Why it happens:** Django doesn't allow cross-origin requests by default
**How to avoid:** Configure django-cors-headers properly

```python
# settings.py
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be high in list
    ...
]

# Development
CORS_ALLOW_ALL_ORIGINS = True  # Only for dev!

# Production
CORS_ALLOWED_ORIGINS = [
    'https://your-app-domain.com',
]
```

---

## Code Examples

### Custom Registration Serializer with Disclaimer

```python
# apps/users/serializers.py
from dj_rest_auth.registration.serializers import RegisterSerializer
from rest_framework import serializers
from django.utils import timezone

class CustomRegisterSerializer(RegisterSerializer):
    disclaimer_accepted = serializers.BooleanField(required=True)
    disclaimer_version = serializers.CharField(required=True)

    def validate_disclaimer_accepted(self, value):
        if not value:
            raise serializers.ValidationError(
                "면책조항에 동의해야 합니다."
            )
        return value

    def custom_signup(self, request, user):
        user.disclaimer_accepted = True
        user.disclaimer_accepted_at = timezone.now()
        user.disclaimer_version = self.validated_data.get('disclaimer_version')
        user.save()

        # Also create DisclaimerConsent record for audit
        from apps.consents.models import DisclaimerConsent
        DisclaimerConsent.objects.create(
            user=user,
            version=user.disclaimer_version,
            content_hash=self.validated_data.get('disclaimer_version'),  # In prod, hash the actual content
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
```

### Partner Invite API Views

```python
# apps/couples/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import InviteCode, Couple
from .serializers import InviteCodeSerializer, CoupleSerializer

class InviteCodeViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate new invite code for current user"""
        try:
            invite_code = InviteCode.create_for_user(request.user)
            return Response({
                'code': invite_code.code,
                'expires_at': invite_code.expires_at.isoformat(),
                'deep_link': f'couplesai://invite?code={invite_code.code}'
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def redeem(self, request):
        """Redeem invite code to connect with partner"""
        code = request.data.get('code', '').upper()

        try:
            invite_code = InviteCode.objects.get(code=code)
        except InviteCode.DoesNotExist:
            return Response(
                {'error': '유효하지 않은 코드입니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not invite_code.is_valid:
            return Response(
                {'error': '만료되었거나 이미 사용된 코드입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if invite_code.creator == request.user:
            return Response(
                {'error': '본인의 코드는 사용할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user already in a couple
        existing = Couple.objects.filter(
            models.Q(user1=request.user) | models.Q(user2=request.user),
            status=Couple.Status.ACTIVE
        ).exists()

        if existing:
            return Response(
                {'error': '이미 파트너와 연결되어 있습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Connect the couple
        couple = invite_code.couple
        couple.user2 = request.user
        couple.status = Couple.Status.ACTIVE
        couple.connected_at = timezone.now()
        couple.save()

        # Mark code as used
        invite_code.used_by = request.user
        invite_code.used_at = timezone.now()
        invite_code.save()

        # TODO: Send push notification to partner

        return Response({
            'message': '파트너와 연결되었습니다!',
            'couple': CoupleSerializer(couple).data
        })


class CoupleViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get current user's couple info"""
        couple = Couple.objects.filter(
            models.Q(user1=request.user) | models.Q(user2=request.user),
            status=Couple.Status.ACTIVE
        ).first()

        if not couple:
            return Response({'couple': None})

        return Response({
            'couple': CoupleSerializer(couple).data,
            'partner': {
                'id': couple.get_partner(request.user).id,
                'email': couple.get_partner(request.user).email,
            }
        })

    @action(detail=False, methods=['post'])
    def disconnect(self, request):
        """Disconnect from partner"""
        couple = Couple.objects.filter(
            models.Q(user1=request.user) | models.Q(user2=request.user),
            status=Couple.Status.ACTIVE
        ).first()

        if not couple:
            return Response(
                {'error': '연결된 파트너가 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        couple.status = Couple.Status.DISCONNECTED
        couple.disconnected_at = timezone.now()
        couple.save()

        # TODO: Send push notification to ex-partner

        return Response({'message': '파트너 연결이 해제되었습니다.'})
```

### Mobile JWT Token Storage (Expo)

```typescript
// lib/auth.ts (React Native / Expo)
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const TokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async setTokens(access: string, refresh: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};

// Usage in login
async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/v1/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (response.ok) {
    await TokenStorage.setTokens(data.access, data.refresh);
    return { success: true };
  }

  return { success: false, error: data.detail };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Session auth for mobile | JWT with simplejwt | 2022+ | Stateless, scalable, mobile-optimized |
| Custom registration views | dj-rest-auth | 2020+ | Complete auth endpoints out of box |
| Supabase/Firebase | Django + DRF | N/A (user choice) | Full control, self-hosted, existing infrastructure |
| Polling for real-time | Django Channels | 2018+ | Sub-second latency, WebSocket native |
| Plain text sensitive data | djfernet encryption | 2020+ | AES encryption at field level |
| daphne only | daphne + gunicorn | 2023+ | Split HTTP/WebSocket for stability option |

**Deprecated/outdated:**
- **djangorestframework-jwt (jpadilla):** Unmaintained since 2020, use simplejwt instead
- **django-rest-framework-simplejwt before v5:** Lacks important security features
- **InMemoryChannelLayer in production:** Only for testing, no persistence or scaling

---

## Legal & Compliance Notes (Korea)

### Korean Recording Law (통신비밀보호법)

**Legal status:** One-party consent is legal in Korea. A conversation participant can record without the other party's consent without criminal liability.

**However, for this app:**
- Per CONTEXT.md decision: "녹음 동의: 매번 녹음 시 요청, 양측 동의 시에만 진행"
- **Ethical position:** Dual consent is mandatory for relationship safety
- Recording without partner consent could enable abuse scenarios

### PIPA Compliance (개인정보보호법)

**App requirements:**
- Clear privacy notice in Korean
- Explicit consent for data collection (disclaimer)
- Data encryption at rest (AES-256 via djfernet)
- User data deletion capability
- Consent records with version tracking

---

## Open Questions

Things that couldn't be fully resolved:

1. **WebSocket reconnection strategy**
   - What we know: Django Channels handles connections well, but mobile networks are unreliable
   - What's unclear: Best reconnection backoff strategy for mobile apps
   - Recommendation: Implement exponential backoff (1s, 2s, 4s, 8s, max 30s) with jitter

2. **Push notification for partner connection**
   - What we know: Need to notify partner when connected or consent requested
   - What's unclear: Best push notification service integration (FCM, APNs)
   - Recommendation: Implement in Phase 2, use in-app polling initially

3. **Email verification UX for mobile**
   - What we know: django-allauth requires email verification by default
   - What's unclear: Best way to handle verification link on mobile (deep link back?)
   - Recommendation: Consider disabling for MVP, implement deep link handler later

---

## Sources

### Primary (HIGH confidence)
- [djangorestframework-simplejwt Documentation](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Django Channels Documentation](https://channels.readthedocs.io/en/latest/)
- [dj-rest-auth Documentation](https://dj-rest-auth.readthedocs.io/)
- [Django REST Framework Authentication](https://www.django-rest-framework.org/api-guide/authentication/)
- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)

### Secondary (MEDIUM confidence)
- [Django Channels Redis GitHub](https://github.com/django/channels_redis)
- [djfernet GitHub](https://github.com/yourlabs/djfernet)
- [Django Official Daphne Deployment](https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/daphne/)
- [Django Custom User Model](https://docs.djangoproject.com/en/5.0/topics/auth/customizing/)

### Tertiary (LOW confidence)
- WebSearch results for Django Channels JWT middleware patterns
- WebSearch results for mobile JWT token refresh patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are well-maintained, documented, Django ecosystem standards
- Architecture patterns: HIGH - Based on official documentation and common patterns
- Security: HIGH - Based on official docs and security best practices
- Korean legal: MEDIUM - Based on web sources, recommend legal review
- Mobile integration: MEDIUM - expo-secure-store documented, but integration patterns extrapolated

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain)
