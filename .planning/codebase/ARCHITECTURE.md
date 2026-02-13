# Architecture

**Analysis Date:** 2026-02-13

## Pattern Overview

**Overall:** Microservices-inspired monolith with separate mobile client

**Key Characteristics:**
- Backend: Django REST Framework + Django Channels (ASGI) for HTTP/WebSocket
- Frontend: React Native (Expo) with file-based routing (expo-router)
- Real-time: WebSocket consumers for chat and consent coordination
- Async tasks: Celery with Redis broker for background processing
- AI/LLM: LangGraph state machines for multi-agent therapy workflows

## Layers

**Mobile Client (React Native):**
- Purpose: iOS/Android app providing therapy UI
- Location: `mobile/src/`
- Contains: Expo Router screens, feature modules, React hooks, API client
- Depends on: Backend REST API (`/api/v1/*`), WebSocket endpoints
- Used by: End users (couples seeking therapy assistance)

**API Layer (Django REST Framework):**
- Purpose: REST endpoints for CRUD operations and authentication
- Location: `backend/apps/*/views.py`, `backend/apps/*/serializers.py`
- Contains: ViewSets, serializers, URL routing
- Depends on: Service layer, Django ORM models
- Used by: Mobile client via axios HTTP client

**WebSocket Layer (Django Channels):**
- Purpose: Real-time bidirectional communication
- Location: `backend/apps/*/consumers.py`, `backend/apps/*/routing.py`
- Contains: AsyncJsonWebsocketConsumer classes for chat and consent flows
- Depends on: Channel layers (Redis), Django ORM
- Used by: Mobile client for live chat updates and dual-consent prompts

**Service Layer (Business Logic):**
- Purpose: Core therapy workflows and LLM orchestration
- Location: `backend/apps/*/services/`
- Contains: LangGraph state machines, data collectors, trigger logic
- Depends on: Django models, LangChain/LangGraph, external LLM APIs
- Used by: Views, Celery tasks, WebSocket consumers

**Domain Models (Django ORM):**
- Purpose: Data persistence and relationships
- Location: `backend/apps/*/models.py`
- Contains: User, Couple, Conversation, Message, InsightReport, etc.
- Depends on: PostgreSQL database
- Used by: All backend layers

**Task Queue (Celery):**
- Purpose: Async background jobs (audio transcription, analysis triggers)
- Location: `backend/apps/*/tasks.py`
- Contains: Celery task definitions
- Depends on: Redis broker, service layer
- Used by: API views (trigger async work), celery-beat (scheduled jobs)

## Data Flow

**User Chat Flow (Accumulative Therapy):**

1. User types message in mobile `chat.tsx` screen
2. Mobile sends POST `/api/v1/chat/conversations/{id}/messages/`
3. Django view creates Message model, invokes `run_chat_agent_pipeline()`
4. LangGraph `chat_graph.py` executes:
   - Determine conversation phase (initial/exploring/deepening/wrapping_up)
   - Evaluate information checklist (6 boolean fields)
   - Generate therapeutic listener response via LLM
   - Update conflict information state
5. Response returned to mobile, displayed in chat UI
6. Mobile persists chat state to local component state

**Insight Report Generation Flow:**

1. `TriggerService.check_and_trigger()` evaluates conditions (message count, mood decline, etc.)
2. Creates InsightReport with status='pending'
3. Dispatches Celery task `run_intelligence_analysis.delay(report_id)`
4. `analysis_graph.py` executes multi-agent pipeline:
   - collect_data: Gather conversations, check-ins, activities (14 days lookback)
   - parallel_analysis: Pattern analyst + emotion interpreter (sequential in sync context)
   - balance_mediator: Analyze relationship dynamics
   - resolution_strategist: Suggest action plans
   - report_synthesizer: Build final report with title, summary, insights
   - ethics_guardian: Review for safety/appropriateness (blocks if harmful)
   - save_report or mark_blocked: Persist to InsightReport model
5. Mobile polls `/api/v1/intelligence/reports/` to retrieve completed report
6. Displays report in `report/[id].tsx` screen

**WebSocket Chat Updates:**

1. User shares reframing with partner via WebSocket
2. `ChatConsumer.receive_json({'action': 'share_reframing', ...})`
3. Creates SharedReframing model, sends to couple group channel
4. Partner's WebSocket receives 'reframing_shared' event
5. Partner's mobile app shows notification/badge

**State Management:**

- Backend: Django ORM transactions, Celery task state, LangGraph internal state
- Frontend: React hooks (useState, useContext), no global state library
- Real-time: Channel layers (Redis) for WebSocket group messaging

## Key Abstractions

**LangGraph StateMachine:**
- Purpose: Orchestrate multi-step LLM workflows with state passing
- Examples: `backend/apps/chat/services/chat_agent/chat_graph.py`, `backend/apps/intelligence/services/analysis_graph.py`
- Pattern: Define TypedDict state, add nodes (functions), connect with edges, compile once, invoke with initial state

**Django App:**
- Purpose: Bounded context for a therapy feature domain
- Examples: `backend/apps/chat/`, `backend/apps/intelligence/`, `backend/apps/couples/`
- Pattern: Standard Django structure (models.py, views.py, serializers.py, urls.py, services/, tasks.py)

**Feature Module (Mobile):**
- Purpose: Co-located UI components and hooks for a feature
- Examples: `mobile/src/features/chat/`, `mobile/src/features/intelligence/`
- Pattern: `components/`, `hooks/`, `services/` subdirectories with TypeScript/TSX files

**Expo Router Screen:**
- Purpose: File-based routing convention for navigation
- Examples: `mobile/src/app/(main)/chat.tsx`, `mobile/src/app/(auth)/sign-in.tsx`
- Pattern: Parentheses indicate route groups (layout boundaries), brackets indicate dynamic params

## Entry Points

**Backend HTTP:**
- Location: `backend/config/wsgi.py` (production WSGI), `backend/manage.py runserver` (dev)
- Triggers: HTTP requests to Django
- Responsibilities: Route to REST views

**Backend WebSocket:**
- Location: `backend/config/asgi.py`
- Triggers: WebSocket connections
- Responsibilities: Protocol router delegates to Channels consumers

**Backend Async Tasks:**
- Location: `backend/config/celery.py` (implicit, discovered by Celery)
- Triggers: `task.delay()` calls, celery-beat scheduler
- Responsibilities: Execute background jobs (transcription, analysis)

**Mobile App:**
- Location: `mobile/src/app/_layout.tsx`
- Triggers: App launch
- Responsibilities: Initialize providers (AuthProvider, PartnerProvider), configure navigation, load fonts

**Mobile Entry Screen:**
- Location: `mobile/src/app/index.tsx`
- Triggers: Root route navigation
- Responsibilities: Auth-based routing (redirect to sign-in, onboarding, or home)

## Error Handling

**Strategy:** Layered with fallbacks

**Patterns:**
- Backend views: Try-except blocks, return HTTP 400/500 with JSON error detail
- LangGraph nodes: Raise exceptions caught by graph executor, mark reports as failed
- Celery tasks: Retry with exponential backoff, log failures to Sentry
- Mobile API calls: Axios interceptors catch 401 (token refresh), errors shown via alerts
- WebSocket: Close codes (4001=unauthorized, 4003=no couple), reconnect logic in mobile

## Cross-Cutting Concerns

**Logging:** Python logging module (Django default), `logger = logging.getLogger(__name__)` in services

**Validation:**
- Backend: DRF serializers with validation methods, Zod schemas in mobile
- LLM: JSON parsing with graceful fallbacks to plain text

**Authentication:**
- Backend: JWT via `rest_framework_simplejwt`, custom middleware for WebSocket auth
- Mobile: Token storage in expo-secure-store, axios interceptors add Bearer header

**Encryption:**
- Sensitive fields use `fernet_fields.EncryptedTextField` (e.g., Message.content, SharedReframing.partner_response)

**Rate Limiting:**
- DRF throttle classes (20/min anon, 100/min user, 5/min auth endpoints)

**CORS:**
- `django-cors-headers` middleware allows mobile app origin

---

*Architecture analysis: 2026-02-13*
