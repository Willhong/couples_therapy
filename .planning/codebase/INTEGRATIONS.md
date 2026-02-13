# External Integrations

**Analysis Date:** 2026-02-13

## APIs & External Services

**AI/LLM Services (Multi-Provider):**
- OpenAI - Chat completion and transcription
  - SDK: `openai` (Python), direct API via `langchain-openai`
  - Auth: `OPENAI_API_KEY` env var
  - Models: `gpt-4o` (chat), `gpt-4o-mini` (summary), Whisper (transcription)
  - Usage: `backend/apps/audio/services/transcription.py`, `backend/apps/chat/services/llm_service.py`

- Anthropic Claude - Chat completion
  - SDK: `langchain-anthropic`
  - Auth: `ANTHROPIC_API_KEY` env var
  - Models: `claude-sonnet-4-5-20250929` (chat), `claude-haiku-3-5-20241022` (summary)
  - Usage: `backend/apps/chat/services/llm_service.py`

- Google Gemini - Chat completion
  - SDK: `langchain-google-genai`
  - Auth: `GOOGLE_API_KEY` env var
  - Models: `gemini-2.0-flash` (chat and summary)
  - Usage: `backend/apps/chat/services/llm_service.py`

- OpenRouter - Multi-model proxy
  - SDK: `langchain-openai` (OpenAI-compatible)
  - Auth: `OPENROUTER_API_KEY` env var
  - Models: Configurable via `OPENROUTER_CHAT_MODEL` and `OPENROUTER_SUMMARY_MODEL`
  - Usage: `backend/apps/chat/services/llm_service.py`

**Provider Selection:**
- Config: `LLM_PROVIDER` env var (openai/anthropic/google/openrouter)
- Factory: `backend/apps/chat/services/llm_service.py` - `get_llm_for_tier()`
- Tiers: `chat` (full reasoning), `summarization` (faster/cheaper)
- Settings: `config/settings/base.py` lines 261-288

**Push Notifications:**
- Expo Push Notifications - Mobile push delivery
  - SDK: `exponent-server-sdk` (Python)
  - Implementation: `backend/apps/core/notifications.py`
  - Token storage: `User.expo_push_token` field
  - Client: `expo-notifications` (mobile)

## Data Storage

**Databases:**
- PostgreSQL 16
  - Connection: `DATABASE_URL` env var
  - ORM: Django ORM
  - Container: `postgres:16-alpine` image (docker-compose)
  - Port: 5432

**Caching/Real-time:**
- Redis 7
  - Connections:
    - `REDIS_URL` (db 0) - Django Channels WebSocket
    - `CACHE_REDIS_URL` (db 2) - Application cache
    - `CELERY_BROKER_URL` (db 1) - Celery task queue
    - `CELERY_RESULT_BACKEND` (db 1) - Task results
  - Container: `redis:7-alpine` image (docker-compose)
  - Port: 6379

**File Storage:**
- Local filesystem - Audio files and media
  - Backend path: `backend/media/` (mounted volume in production)
  - Config: `MEDIA_ROOT` and `MEDIA_URL` in `config/settings/base.py`
  - Mobile: `expo-file-system` for local caching

**Temporary Storage:**
- Expo File System - Mobile app local storage
  - SDK: `expo-file-system`
  - Usage: Audio recordings before upload

## Authentication & Identity

**Auth Provider:**
- Custom JWT (django-allauth + djangorestframework-simplejwt)
  - Implementation: Email/password based
  - Token storage: `expo-secure-store` (iOS Keychain, Android Keystore)
  - Refresh flow: Automatic via `mobile/src/lib/api.ts` interceptors
  - Session lifetime:
    - Access: 30 minutes
    - Refresh: 7 days
    - Rotation: Enabled with blacklist
  - Social auth ready: `django-allauth` supports OAuth (not currently enabled)

**Token Management:**
- Backend endpoints:
  - Registration: `/api/v1/auth/registration/`
  - Login: `/api/v1/auth/token/`
  - Refresh: `/api/v1/auth/token/refresh/`
- Mobile storage: `mobile/src/lib/auth.ts` - `TokenStorage`
- Config: `SIMPLE_JWT` in `config/settings/base.py` lines 198-214

## Monitoring & Observability

**Error Tracking:**
- Sentry (optional)
  - SDK: `sentry-sdk` (Python)
  - Auth: `SENTRY_DSN` env var
  - Config: `config/settings/production.py`

**Logs:**
- Django logging framework (stdout/stderr)
- Containerized output (Docker logs)
- No external log aggregation service configured

## CI/CD & Deployment

**Hosting:**
- Docker containers (self-hosted or cloud)
  - Backend: Port 8000 (Daphne ASGI server)
  - Database: PostgreSQL container
  - Cache: Redis container
  - Workers: Celery worker + Celery beat containers

**Container Orchestration:**
- Docker Compose for development
  - File: `docker-compose.yml`
  - Services: backend, db, redis, celery-worker, celery-beat
  - Volumes: postgres_data, media_data

**Mobile Deployment:**
- Expo Application Services (EAS) compatible
  - Config: `mobile/app.json`
  - Bundle identifier: `com.couplesai.app`
  - URL scheme: `couplesai://`

**CI Pipeline:**
- Not configured (no `.github/workflows/`, no CI config files detected)

## Environment Configuration

**Backend Required Variables:**
- `DJANGO_SECRET_KEY` - Django sessions and JWT signing
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Channels WebSocket layer
- `CELERY_BROKER_URL` - Task queue
- `LLM_PROVIDER` - AI provider selection
- `OPENAI_API_KEY` - Transcription (always required)
- Provider-specific: `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, or `OPENROUTER_API_KEY`
- `FERNET_KEYS` - Symmetric encryption (JSON list)

**Backend Optional Variables:**
- `SENTRY_DSN` - Error tracking
- `CELERY_TASK_ALWAYS_EAGER` - Sync task execution for dev
- `ACCUMULATIVE_THERAPY_ENABLED` - Feature flag
- Model overrides: `OPENAI_CHAT_MODEL`, `ANTHROPIC_SUMMARY_MODEL`, etc.
- `LLM_MAX_TOKENS`, `LLM_TEMPERATURE` - AI parameters

**Mobile Required Variables:**
- `EXPO_PUBLIC_API_URL` - Backend URL (default: `http://localhost:8000`)

**Secrets Location:**
- Backend: `.env` file (gitignored, template at `.env.example`)
- Mobile: Environment variables (managed by Expo/EAS)
- Production: Docker environment variables or secrets manager

## WebSockets & Real-time

**Backend WebSocket:**
- Django Channels 4.3+
  - ASGI: `config/asgi.py`
  - Channel layer: Redis (db 0)
  - Routing: `apps/chat/routing.py`, `apps/consents/routing.py`
  - Consumers:
    - `apps/chat/consumers.py` - Chat WebSocket
    - `apps/consents/consumers.py` - Consent flow WebSocket

**Mobile WebSocket:**
- Native WebSocket API
  - Connection: `mobile/src/hooks/useRecordingConsent.ts` line 208
  - URL pattern: `ws://{API_URL}/ws/chat/?token={jwt}`
  - Auth: JWT token in query parameter
  - Implementation: `mobile/src/features/sharing/hooks/usePartnerSharing.ts`

**Connection Flow:**
- Client derives WebSocket URL from `API_URL`
- HTTP → WS, HTTPS → WSS transformation
- JWT token passed via query parameter
- Channels authenticates via token

## Background Jobs

**Task Queue:**
- Celery 5.4+ with Redis broker
  - Broker: Redis db 1
  - Result backend: Redis db 1
  - Beat scheduler: `django-celery-beat`
  - Tasks: `backend/apps/audio/tasks.py`
  - Workers: Containerized (`celery-worker` service)
  - Scheduler: Containerized (`celery-beat` service)

**Development Mode:**
- `CELERY_TASK_ALWAYS_EAGER=true` - Synchronous execution (no Redis required)

## Deep Links & Schemes

**Mobile URL Schemes:**
- Custom scheme: `couplesai://`
  - iOS: Configured in `app.json` infoPlist.CFBundleURLSchemes
  - Android: Intent filters in `app.json` android.intentFilters
- Use case: Partner invitation deep links (`couplesai://invite`)

## Mobile Platform APIs

**iOS:**
- Keychain Services - Token storage (via `expo-secure-store`)
- AVFoundation - Audio recording (via `expo-av`)
- UserNotifications - Push notifications (via `expo-notifications`)
- Permissions: Microphone, Camera (configured in `app.json`)

**Android:**
- Android Keystore - Token storage (via `expo-secure-store`)
- MediaRecorder - Audio recording (via `expo-av`)
- Firebase Cloud Messaging - Push notifications (via `expo-notifications`)
- Permissions: Audio recording, camera (configured in `app.json`)

---

*Integration audit: 2026-02-13*
