# Technology Stack

**Analysis Date:** 2026-02-13

## Languages

**Primary:**
- Python 3.12 - Backend API and AI services
- TypeScript 5.9.2 - Mobile application

**Secondary:**
- JavaScript - Build tooling and configuration

## Runtime

**Backend:**
- Python 3.12 (containerized)
- ASGI server: Daphne 4.1+
- Package Manager: pip
- Lockfile: `backend/requirements.txt`

**Mobile:**
- Node.js (Expo managed)
- React Native 0.81.5
- React 19.1.0
- Package Manager: npm
- Lockfile: `mobile/package-lock.json`

## Frameworks

**Backend Core:**
- Django 5.0+ - Web framework
- Django REST Framework 3.15+ - REST API
- Channels 4.3+ - WebSocket support
- Daphne 4.1+ - ASGI server

**Backend AI/ML:**
- LangChain 0.3.0+ - LLM orchestration
- LangGraph 0.2.0+ - Stateful AI workflows
- OpenAI SDK 1.50.0+ - Direct transcription API

**Mobile Core:**
- Expo SDK 54.0 - React Native framework
- Expo Router 6.0 - File-based routing
- React Native 0.81.5 - Mobile framework

**Mobile UI:**
- React Native Reanimated 4.1 - Animations
- React Native Gesture Handler 2.28 - Touch handling
- Lucide React Native 0.563 - Icons
- React Native Gifted Charts 1.4 - Data visualization

**Testing:**
- Django test framework (unittest-based)
- Test files: `backend/apps/*/tests.py`

**Build/Dev:**
- Babel 7.25+ - JavaScript transpilation
- Metro bundler - React Native bundling
- Docker + Docker Compose - Container orchestration
- WhiteNoise 6.5+ - Static file serving

## Key Dependencies

**Backend Critical:**
- `psycopg[binary]` 3.1+ - PostgreSQL adapter
- `djangorestframework-simplejwt` 5.3+ - JWT authentication
- `channels-redis` 4.2+ - WebSocket channel layer
- `celery` 5.4.0+ - Async task queue
- `django-celery-beat` 2.5.0+ - Periodic tasks
- `langchain-openai` 0.2.0+ - OpenAI LLM provider
- `langchain-anthropic` 0.3.0+ - Anthropic LLM provider
- `langchain-google-genai` 2.0.0+ - Google LLM provider
- `exponent-server-sdk` 2.1+ - Push notifications

**Backend Infrastructure:**
- `redis` 5.0+ - Cache and message broker
- `django-cors-headers` 4.3+ - CORS handling
- `django-allauth` 0.61+ - Social authentication
- `sentry-sdk` 2.0+ - Error tracking
- `djfernet` 0.8+ - Encryption
- `django-environ` 0.11+ - Environment configuration
- `drf-nested-routers` 0.94+ - Nested API routes

**Mobile Critical:**
- `axios` 1.6.0+ - HTTP client
- `expo-secure-store` 15.0+ - Token storage (Keychain/Keystore)
- `expo-notifications` 0.32+ - Push notifications
- `expo-av` 16.0+ - Audio recording
- `expo-file-system` 19.0+ - File operations
- `react-hook-form` 7.54+ - Form management
- `zod` 3.24+ - Schema validation

**Mobile UI:**
- `@hookform/resolvers` 3.10+ - Form validation
- `react-native-svg` 15.12 - SVG support
- `expo-linear-gradient` 15.0+ - Gradients
- `react-native-copilot` 3.0+ - Onboarding tours

## Configuration

**Backend Environment:**
- Config location: `backend/.env` (not committed)
- Example: `backend/.env.example`
- Settings modules:
  - `config/settings/base.py` - Shared settings
  - `config/settings/development.py` - Local dev
  - `config/settings/production.py` - Production
- Selected via `DJANGO_SETTINGS_MODULE` env var

**Backend Required Variables:**
- `DJANGO_SECRET_KEY` - Session/JWT signing
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis for Channels
- `CELERY_BROKER_URL` - Redis for Celery
- `LLM_PROVIDER` - AI provider (openai/anthropic/google/openrouter)
- `OPENAI_API_KEY` - Transcription service
- `FERNET_KEYS` - Encryption keys

**Mobile Environment:**
- Config: `mobile/app.json` (Expo config)
- Environment variable: `EXPO_PUBLIC_API_URL`
- Default backend: `http://localhost:8000`
- TypeScript: `mobile/tsconfig.json`
- Babel: `mobile/babel.config.js`

**Build:**
- Backend Dockerfile: `backend/Dockerfile`
- Docker Compose: `docker-compose.yml`
- Metro bundler: `mobile/metro.config.js`

## Platform Requirements

**Development:**
- Python 3.12+
- Node.js (managed by Expo)
- Docker + Docker Compose
- PostgreSQL 16
- Redis 7

**Production:**
- Container runtime (Docker)
- PostgreSQL 16
- Redis 7
- Reverse proxy (for WebSocket and static files)
- iOS/Android build environment (for mobile)

**Mobile Deployment:**
- iOS: Xcode, Apple Developer account
- Android: Android Studio, Google Play Console
- Expo Application Services (EAS) compatible

---

*Stack analysis: 2026-02-13*
