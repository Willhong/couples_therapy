# Technology Stack -- v1.1 Intelligence & Launch Additions

**Project:** CouplesAI v1.1
**Researched:** 2026-02-13
**Mode:** Subsequent milestone -- NEW additions only
**Overall Confidence:** HIGH

---

## Executive Summary

v1.0 shipped with Django 5.x + DRF, Expo SDK 54 + expo-router 6, LangChain 0.3, LangGraph 0.2+, OpenRouter/OpenAI, Redis, Celery, and Fernet encryption. The codebase already has `psycopg[binary]>=3.1` in requirements.txt, `langgraph>=0.2.0` installed, `exponent-server-sdk>=2.1` listed, and `expo-notifications ^0.32.16` in package.json.

**The critical finding of this research: almost everything v1.1 needs is ALREADY in requirements.txt and package.json.** The existing dependency versions are compatible with all planned v1.1 features. The work is primarily architectural (new services, new graph topology, new models) not dependency-driven.

What actually needs to change:
1. **Pin langgraph to >=0.2.60 or >=1.0.0** -- the current `>=0.2.0` floor is too low for reliable `add_conditional_edges` with list returns (fan-out). LangGraph 1.0.8 is current stable.
2. **PostgreSQL migration** -- switch development from SQLite to PostgreSQL 16 (docker-compose already has it). No new Python dependency; `psycopg[binary]` is already in requirements.txt.
3. **Push notification wiring** -- `expo-notifications` and `exponent-server-sdk` are already installed. Need `expo-device` and `expo-constants` (already in package.json). Just configuration work.
4. **No new backend dependencies needed** for multi-agent analysis, chat agent, health score, trigger service, or information state tracking. These use LangGraph StateGraph, Django ORM, Celery beat, and Django cache -- all already configured.

---

## Existing Stack (DO NOT RE-INSTALL)

These are already in requirements.txt and package.json. Listed for clarity on what is available.

### Backend (Python)

| Technology | Current Pin | Actual Latest | Purpose | Status |
|------------|------------|---------------|---------|--------|
| Django | >=5.0,<6.0 | 5.2.x | Web framework | OK |
| DRF | >=3.15 | 3.15.x | REST API | OK |
| langchain | >=0.3.0 | 0.3.x | LLM interface | OK |
| langchain-core | >=0.3.0 | 1.2.11 | LangChain core | **Update pin** |
| langgraph | >=0.2.0 | 1.0.8 | Stateful agent graphs | **Update pin** |
| langchain-openai | >=0.2.0 | Latest | OpenAI/OpenRouter models | OK |
| langchain-anthropic | >=0.3.0 | Latest | Anthropic models | OK |
| langchain-google-genai | >=2.0.0 | Latest | Google models | OK |
| celery | >=5.4.0 | 5.4.x | Async task queue | OK |
| django-celery-beat | >=2.5.0 | 2.7.x | Periodic tasks | OK |
| channels | >=4.3 | 4.3.x | WebSocket | OK |
| channels-redis | >=4.2 | 4.2.x | Redis channel layer | OK |
| redis | >=5.0 | 5.2.x | Cache/broker | OK |
| psycopg[binary] | >=3.1 | 3.3.2 | PostgreSQL driver | OK |
| openai | >=1.50.0 | Latest | Transcription API | OK |
| exponent-server-sdk | >=2.1 | 2.2.0 | Expo push (server) | OK |
| djfernet | >=0.8 | 0.8.x | Fernet encryption | OK |
| sentry-sdk | >=2.0 | Latest | Error tracking | OK |

### Mobile (JavaScript/TypeScript)

| Technology | Current Pin | Purpose | Status |
|------------|------------|---------|--------|
| expo | ~54.0.33 | App framework | OK |
| expo-router | ~6.0.23 | Navigation | OK |
| expo-notifications | ^0.32.16 | Push notifications | OK |
| expo-device | ^8.0.10 | Device info | OK |
| expo-constants | ~18.0.13 | App constants | OK |
| expo-secure-store | ~15.0.8 | Secure storage | OK |
| react-native-gifted-charts | ^1.4.72 | Health score charts | OK |
| axios | ^1.6.0 | HTTP client | OK |
| zod | ^3.24.2 | Schema validation | OK |

---

## Required Changes for v1.1

### 1. LangGraph Version Pin Update (CRITICAL)

| Change | From | To | Why |
|--------|------|----|-----|
| langgraph pin | `>=0.2.0` | `>=0.2.60` | Fan-out conditional edges (returning list from route function) were stabilized around 0.2.50+. Current floor is dangerously low. Production should run 1.0.x. |
| langchain-core pin | `>=0.3.0` | `>=0.3.0` | Keep as-is. The 1.2.x series is backward compatible with 0.3.x API. No breaking changes for our usage. |

**Confidence:** HIGH -- verified via [LangGraph PyPI](https://pypi.org/project/langgraph/) showing 1.0.8 as current stable. The `StateGraph`, `add_conditional_edges`, `START`, `END` API is stable since 0.2.x and unchanged in 1.0.x.

**Rationale:** The analysis_graph.py already uses `StateGraph`, `END`, `add_conditional_edges`, and `set_entry_point`. The chat agent graph (chat_graph.py) needs the same patterns. The fan-out pattern (returning `["node_a", "node_b"]` from a conditional edge for parallel execution) requires >=0.2.50 to work reliably. Pinning to `>=0.2.60` gives headroom while staying compatible with 1.0.x.

**Action:**
```
# In requirements.txt, change:
langgraph>=0.2.0
# To:
langgraph>=0.2.60
```

### 2. PostgreSQL Migration -- Development Environment (REQUIRED)

| Component | Status | Action |
|-----------|--------|--------|
| psycopg[binary] | Already in requirements.txt | None |
| docker-compose.yml | Already has postgres:16-alpine | None |
| production.py | Already has `env.db('DATABASE_URL')` | None |
| base.py | Uses `env.db()` with SQLite default | Change default to PostgreSQL |
| db.sqlite3 | Dev database file | Migrate data or fresh start |

**Why now:** v1.1 adds DailyHealthScore model, InsightReport model (already exists), compound indexes, and JSON field queries that benefit from PostgreSQL's native JSON operators. SQLite's JSON support is limited and behavior differs from PostgreSQL. Developing on SQLite and deploying to PostgreSQL is a well-known source of bugs.

**Confidence:** HIGH -- `psycopg[binary]>=3.1` is already a dependency. Docker-compose already provisions PostgreSQL 16. Production settings already use PostgreSQL. The only change is making development also use PostgreSQL.

**Action:**
```python
# In base.py, change the default DATABASE_URL:
DATABASES = {
    'default': env.db(
        'DATABASE_URL',
        default='postgres://couplesai:couplesai_password@localhost:5432/couplesai'
    )
}
```

**Migration strategy:**
1. Start PostgreSQL via `docker compose up db` (already configured)
2. Update `.env` with `DATABASE_URL=postgres://couplesai:couplesai_password@localhost:5432/couplesai`
3. Run `python manage.py migrate` (fresh schema on PostgreSQL)
4. If dev data needed, use `python manage.py dumpdata --natural-foreign --exclude=contenttypes --exclude=auth.Permission > backup.json` from SQLite, then `python manage.py loaddata backup.json` into PostgreSQL
5. Delete db.sqlite3

### 3. Push Notification Configuration (CONFIGURATION ONLY)

No new packages needed. Both sides are already installed:

**Backend:** `exponent-server-sdk>=2.1` (installed, version 2.2.0 available)
**Mobile:** `expo-notifications ^0.32.16`, `expo-device ^8.0.10`, `expo-constants ~18.0.13` (all installed)

**What needs to be BUILT (not installed):**

| Component | Location | What |
|-----------|----------|------|
| Push token registration | `apps/users/` or `apps/core/` | Endpoint to save Expo push tokens |
| Push token model | `apps/users/models.py` | Store device push tokens per user |
| Notification service | `apps/core/services/` | Service using `exponent_server_sdk` to send pushes |
| Celery task | `apps/intelligence/tasks.py` | Send push when InsightReport ready |
| Mobile registration | `mobile/app/` | Call `registerForPushNotificationsAsync()` on app launch |
| FCM config | `app.json` / EAS | Firebase `google-services.json` for Android |
| APNs config | EAS | Apple Push key for iOS |

**Confidence:** HIGH -- expo-notifications 0.32.16 is the current version for SDK 54. The `exponent-server-sdk` 2.2.0 Python package provides `PushClient` and `PushMessage` for sending from Django.

**IMPORTANT SDK 54 change:** Push notifications no longer work in Expo Go. Testing requires a Development Build. This is a workflow concern, not a dependency concern.

### 4. No New Dependencies for Intelligence Features

These v1.1 features use ONLY existing dependencies:

| Feature | Dependencies Used | New Package? |
|---------|-------------------|-------------|
| Multi-agent analysis graph | langgraph StateGraph, langchain-core | No (already installed) |
| Chat agent with information state | langgraph StateGraph, langchain-core | No (already installed) |
| Health score computation | Django ORM, celery-beat | No (already installed) |
| DailyHealthScore storage | Django models, JSONField | No (already installed) |
| Analysis trigger service | Celery tasks, Django ORM | No (already installed) |
| UserIntelligenceService | Django cache, Django ORM | No (already installed) |
| Mood-pattern correlation | Django ORM, Django cache | No (already installed) |
| Recommendation engine | Django ORM | No (already installed) |
| InsightReport delivery | DRF serializers, Django views | No (already installed) |
| Insight report API | DRF, Django views | No (already installed) |
| Encrypted fields | djfernet EncryptedTextField | No (already installed) |
| Background analysis | Celery worker + beat | No (already installed) |

---

## What NOT to Add

| Technology | Why NOT |
|------------|---------|
| `langgraph-supervisor` | Plans explicitly chose manual StateGraph over `create_supervisor()` for deterministic routing and parallel execution control |
| `langgraph-prebuilt` | Not needed -- the therapy graph uses custom state and nodes, not prebuilt ReAct agents |
| `langchain-community` | No community integrations needed -- all LLM calls go through langchain-openai/anthropic/google |
| `celery[redis]` | Redis backend already configured via separate `redis` package |
| `django-redis` | Using Django's built-in `django.core.cache.backends.redis.RedisCache` (Django 4.0+). No third-party cache backend needed. |
| `zustand` / `@tanstack/react-query` | Not in current mobile stack (uses axios + local state). Adding state management is a v2 concern. |
| `pydantic` | LangGraph state uses TypedDict, not Pydantic. Mixing both creates confusion. |
| `numpy` / `pandas` | Health score and mood correlation are simple arithmetic. No scientific computing needed. |
| `pgloader` | SQLite-to-PostgreSQL data migration is a one-time dev task. Django's `dumpdata`/`loaddata` is sufficient. |

---

## Version Compatibility Matrix

| Package | Min Required | Tested/Actual | Max Allowed | Notes |
|---------|-------------|---------------|-------------|-------|
| Python | 3.10 | 3.12 | 3.13 | Dockerfile uses python:3.12-slim |
| Django | 5.0 | 5.2 | <6.0 | JSONField, async views, built-in Redis cache |
| langgraph | 0.2.60 | 1.0.8 | 1.x | StateGraph API stable across 0.2.x -> 1.0.x |
| langchain-core | 0.3.0 | 1.2.11 | 1.x | Backward compatible |
| psycopg | 3.1 | 3.3.2 | 3.x | Binary driver via psycopg[binary] |
| PostgreSQL | 14 | 16 | 17 | docker-compose uses 16-alpine |
| Redis | 6.0 | 7.x | 7.x | docker-compose uses redis:7-alpine |
| Expo SDK | 54 | 54.0.33 | 54.x | Locked to SDK 54 release train |
| expo-notifications | 0.32 | 0.32.16 | 0.32.x | Locked to SDK 54 compatible range |

---

## Recommended requirements.txt Changes

```diff
# requirements.txt changes for v1.1

 # LangGraph for stateful workflows
-langgraph>=0.2.0
+langgraph>=0.2.60
```

That is the ONLY change to requirements.txt. Everything else is already present.

---

## Infrastructure Stack (Already Configured)

| Component | Image/Version | Docker Service | Purpose |
|-----------|--------------|----------------|---------|
| PostgreSQL | 16-alpine | `db` | Primary database |
| Redis | 7-alpine | `redis` | Cache (db 2), Celery broker (db 1), Channels (db 0) |
| Daphne | 4.1+ | `backend` | ASGI server |
| Celery Worker | 5.4+ | `celery-worker` | Background tasks |
| Celery Beat | 5.4+ | `celery-beat` | Periodic tasks |

All already defined in docker-compose.yml. No infrastructure changes needed.

---

## Per-Feature Technology Mapping

### Feature 1: LangGraph Multi-Agent Analysis Graph

**Uses:** `langgraph.graph.StateGraph`, `langgraph.graph.END`, `langchain_core.messages`

Already implemented in `backend/apps/intelligence/services/analysis_graph.py`. The graph collects data, runs 5 analysis agents sequentially (pattern + emotion in one node, then balance, resolution, synthesizer, ethics), saves to InsightReport.

**Stack note:** The current implementation runs pattern + emotion sequentially in a single `parallel_analysis_node` rather than true LangGraph parallel fan-out. This is intentional -- the sync `graph.invoke()` called from Celery doesn't support true async parallelism. Acceptable since the background analysis is not latency-sensitive.

### Feature 2: Therapeutic Listener Chat Agent

**Uses:** `langgraph.graph.StateGraph`, `langchain_core.messages`, TypedDict state

Already scaffolded in `backend/apps/chat/services/chat_agent/`. Uses:
- `information_state.py` -- ConflictInformation, ChatAgentState, InsightDeliveryState (TypedDict)
- `chat_graph.py` -- Chat agent pipeline (routed via feature flag in reframing_graph.py)
- `insight_delivery.py` -- In-conversation insight delivery logic

**Stack note:** The chat agent uses LangGraph StateGraph for its own graph (separate from the analysis graph). State is conversation-scoped, not persisted to database -- it lives in the LangGraph state dict during a single request. Cross-conversation state (information checklist progress) needs to be persisted to a Django model or the conversation's metadata JSON field.

### Feature 3: Health Score Computation & Storage

**Uses:** Django ORM, JSONField, Celery beat

Already has `DailyHealthScore` model in `patterns/models.py`. Needs:
- `patterns/services/health_score.py` -- HealthScoreService (pure Django ORM queries + arithmetic)
- Celery beat task for daily computation
- API endpoints via DRF

No new dependencies.

### Feature 4: PostgreSQL Migration

**Uses:** `psycopg[binary]` (already installed), PostgreSQL 16 (already in docker-compose)

See section 2 above. Configuration change only.

### Feature 5: Push Notifications

**Uses:** `expo-notifications` (mobile, installed), `exponent-server-sdk` (backend, installed)

See section 3 above. Configuration + new service code, no new dependencies.

### Feature 6: Analysis Trigger Service

**Uses:** Celery tasks, Django ORM, Django cache

Already scaffolded in `backend/apps/intelligence/services/trigger_service.py` and `backend/apps/intelligence/tasks.py`. Uses:
- Celery `shared_task` for trigger evaluation
- Celery beat schedule for periodic evaluation
- Django ORM for querying accumulated data
- Django settings for configurable thresholds (`ANALYSIS_TRIGGER_CONFIG` already in base.py)

No new dependencies.

---

## Environment Variables for v1.1

New or changed environment variables:

| Variable | Default | Purpose | Required For |
|----------|---------|---------|-------------|
| `DATABASE_URL` | `postgres://...localhost:5432/couplesai` | PostgreSQL connection | Dev + Prod |
| `ACCUMULATIVE_THERAPY_ENABLED` | `False` | Feature flag for new chat agent | All environments |
| `EXPO_ACCESS_TOKEN` | (none) | Expo push notification access token | Push notifications (optional, for enhanced security) |

All other environment variables are unchanged from v1.0.

---

## Sources

### Official Documentation (HIGH confidence)
- [LangGraph PyPI -- v1.0.8](https://pypi.org/project/langgraph/) -- verified Feb 2026
- [LangGraph StateGraph docs](https://docs.langchain.com/oss/python/langgraph/quickstart) -- verified Feb 2026
- [langchain-core PyPI -- v1.2.11](https://pypi.org/project/langchain-core/) -- verified Feb 2026
- [psycopg 3.3.2 documentation](https://www.psycopg.org/psycopg3/) -- verified Feb 2026
- [Expo Notifications docs](https://docs.expo.dev/versions/latest/sdk/notifications/) -- verified Feb 2026
- [Expo Push Notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) -- SDK 54 specific
- [exponent-server-sdk PyPI -- v2.2.0](https://pypi.org/project/exponent-server-sdk/) -- verified Feb 2026
- [Django built-in Redis cache backend](https://docs.djangoproject.com/en/5.2/ref/databases/) -- Django 4.0+

### Codebase Verification (HIGH confidence)
- `backend/requirements.txt` -- all dependencies verified present
- `mobile/package.json` -- all mobile dependencies verified present
- `backend/config/settings/base.py` -- LLM config, cache config, Celery config verified
- `backend/config/settings/production.py` -- PostgreSQL, Redis cache, Celery async verified
- `docker-compose.yml` -- PostgreSQL 16, Redis 7, Celery worker/beat verified
- `backend/apps/intelligence/services/analysis_graph.py` -- LangGraph usage verified
- `backend/apps/chat/services/chat_agent/` -- chat agent scaffolding verified
- `backend/apps/patterns/models.py` -- DailyHealthScore model verified
