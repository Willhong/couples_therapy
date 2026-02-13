# Codebase Structure

**Analysis Date:** 2026-02-13

## Directory Layout

```
couples_therapy/
├── backend/               # Django REST API + Channels WebSocket server
│   ├── apps/              # Feature-based Django apps (bounded contexts)
│   ├── config/            # Django settings, URLs, ASGI/WSGI
│   ├── media/             # User-uploaded files (audio recordings)
│   ├── staticfiles/       # Collected static assets (Django admin)
│   ├── .venv/             # Python virtual environment
│   ├── requirements.txt   # Python dependencies
│   └── manage.py          # Django CLI
├── mobile/                # React Native (Expo) iOS/Android app
│   ├── src/               # Application source code
│   │   ├── app/           # Expo Router file-based screens
│   │   ├── features/      # Feature modules (components + hooks)
│   │   ├── components/    # Shared UI components
│   │   ├── lib/           # API client, auth utilities
│   │   ├── services/      # Push notifications, deep links
│   │   ├── theme/         # Design tokens (colors, typography)
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Helper functions
│   ├── assets/            # Images, fonts, static files
│   ├── android/           # Native Android build artifacts
│   ├── node_modules/      # npm dependencies
│   ├── package.json       # npm manifest
│   └── app.json           # Expo configuration
├── .planning/             # GSD codebase analysis and planning docs
├── docs/                  # Documentation (app store assets)
├── plans/                 # Implementation plans (markdown)
├── docker-compose.yml     # Multi-container orchestration (db, redis, backend, celery)
└── README.md              # Project overview
```

## Directory Purposes

**backend/apps/{feature}:**
- Purpose: Domain-specific Django app (one feature per app)
- Contains: models.py, views.py, serializers.py, urls.py, services/, tasks.py, consumers.py
- Key files:
  - `models.py`: Database models
  - `views.py`: REST API endpoints (DRF ViewSets)
  - `services/`: Business logic (LangGraph graphs, data collectors)
  - `tasks.py`: Celery async tasks
  - `consumers.py`: WebSocket handlers (if real-time needed)

**backend/apps/chat:**
- Purpose: Conversation and message management, therapeutic listener chat agent
- Contains: Conversation/Message/SharedReframing models, ChatConsumer, chat_graph.py
- Key files:
  - `backend/apps/chat/services/chat_agent/chat_graph.py`: LangGraph chat pipeline
  - `backend/apps/chat/consumers.py`: WebSocket consumer for real-time sharing
  - `backend/apps/chat/prompts/`: Prompt templates for LLM

**backend/apps/intelligence:**
- Purpose: Accumulative therapy analysis (multi-agent insight generation)
- Contains: InsightReport model, analysis_graph.py, 6 agent nodes
- Key files:
  - `backend/apps/intelligence/services/analysis_graph.py`: Main LangGraph pipeline
  - `backend/apps/intelligence/services/agents/`: Pattern analyst, emotion interpreter, etc.
  - `backend/apps/intelligence/services/trigger_service.py`: Determines when to run analysis

**backend/apps/users:**
- Purpose: User authentication and profile management
- Contains: Custom User model, JWT serializers
- Key files:
  - `backend/apps/users/models.py`: User (email-based auth)
  - `backend/apps/users/serializers.py`: JWT token serializers

**backend/apps/couples:**
- Purpose: Partner pairing and relationship management
- Contains: Couple model, invitation codes
- Key files:
  - `backend/apps/couples/models.py`: Couple (user1, user2, status)

**backend/config:**
- Purpose: Django project configuration
- Contains: settings/, urls.py, asgi.py, wsgi.py
- Key files:
  - `backend/config/settings/base.py`: Shared Django settings
  - `backend/config/urls.py`: Root URL routing (API v1)
  - `backend/config/asgi.py`: ASGI app with WebSocket protocol router

**mobile/src/app:**
- Purpose: Expo Router screens (file-based routing)
- Contains: Route groups, dynamic routes, layouts
- Key files:
  - `mobile/src/app/_layout.tsx`: Root layout (providers, navigation config)
  - `mobile/src/app/index.tsx`: Entry screen (auth redirect logic)
  - `mobile/src/app/(auth)/`: Auth screens (sign-in, sign-up, safety assessment)
  - `mobile/src/app/(main)/`: Main app screens (home, chat, insights, settings)
  - `mobile/src/app/onboarding/`: Onboarding flow (questionnaire, partner link)

**mobile/src/features/{feature}:**
- Purpose: Feature module with co-located components and hooks
- Contains: components/, hooks/, services/ subdirectories
- Key files:
  - `components/`: React components specific to this feature
  - `hooks/`: Custom React hooks (data fetching, state management)
  - `services/`: Feature-specific utilities (WebSocket clients, etc.)

**mobile/src/lib:**
- Purpose: Core utilities shared across features
- Contains: API client, auth token storage
- Key files:
  - `mobile/src/lib/api.ts`: Axios instance with JWT interceptors
  - `mobile/src/lib/auth.ts`: Token storage (expo-secure-store)

**mobile/src/components/ui:**
- Purpose: Shared UI primitives (buttons, inputs, cards)
- Contains: Reusable React components

**mobile/src/theme:**
- Purpose: Design system tokens
- Contains: colors.ts, typography.ts, spacing.ts, shadows.ts
- Key files:
  - `mobile/src/theme/colors.ts`: Color palette
  - `mobile/src/theme/index.ts`: Exports all theme modules

## Key File Locations

**Entry Points:**
- `backend/config/asgi.py`: ASGI application (HTTP + WebSocket)
- `backend/manage.py`: Django CLI
- `mobile/src/app/_layout.tsx`: Mobile app root
- `mobile/src/app/index.tsx`: Mobile entry screen

**Configuration:**
- `backend/config/settings/base.py`: Django settings
- `backend/requirements.txt`: Python dependencies
- `mobile/package.json`: npm dependencies
- `mobile/app.json`: Expo configuration
- `docker-compose.yml`: Container orchestration

**Core Logic:**
- `backend/apps/chat/services/chat_agent/chat_graph.py`: Therapeutic chat agent
- `backend/apps/intelligence/services/analysis_graph.py`: Multi-agent insight pipeline
- `backend/apps/intelligence/services/trigger_service.py`: Analysis trigger logic
- `mobile/src/lib/api.ts`: API client with token refresh

**Testing:**
- `backend/apps/*/tests.py`: Django test cases (pytest style)
- No dedicated test files in mobile (tests not yet implemented)

## Naming Conventions

**Files (Backend):**
- Python modules: `snake_case.py`
- Django apps: `lowercase` (no underscores)
- Service modules: `{feature}_service.py` or `{component}_graph.py`

**Files (Mobile):**
- React components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts` or `.tsx`
- Utilities: `camelCase.ts`
- Screens: `kebab-case.tsx` (Expo Router convention)

**Directories:**
- Backend apps: `lowercase` (e.g., `apps/chat/`, `apps/intelligence/`)
- Mobile features: `lowercase` (e.g., `features/chat/`, `features/insights/`)
- Mobile route groups: `(group-name)` (e.g., `app/(main)/`, `app/(auth)/`)
- Dynamic routes: `[param]` (e.g., `report/[id].tsx`)

## Where to Add New Code

**New Backend Feature:**
- Primary code: `backend/apps/{feature_name}/`
  - Create models in `models.py`
  - Create views in `views.py`
  - Create serializers in `serializers.py`
  - Create URLs in `urls.py`
  - Create services in `services/{service_name}.py`
  - Register app in `backend/config/settings/base.py` INSTALLED_APPS
  - Include URLs in `backend/config/urls.py`
- Tests: `backend/apps/{feature_name}/tests.py`

**New LangGraph Agent:**
- Implementation: `backend/apps/{feature}/services/agents/{agent_name}.py`
- Integration: Import in parent graph (e.g., `analysis_graph.py`), add node and edges
- Prompts: `backend/apps/{feature}/prompts/{agent_name}_prompts.py`

**New Mobile Screen:**
- Primary code: `mobile/src/app/(main)/{screen-name}.tsx` (or appropriate route group)
- If complex, extract feature module: `mobile/src/features/{feature}/components/{ComponentName}.tsx`

**New Mobile Feature Module:**
- Implementation: `mobile/src/features/{feature}/`
  - Components: `components/{ComponentName}.tsx`
  - Hooks: `hooks/use{HookName}.ts`
  - Services: `services/{serviceName}.ts`

**Utilities:**
- Backend shared helpers: `backend/apps/core/services/` or `backend/apps/core/utils.py`
- Mobile shared helpers: `mobile/src/utils/{utilityName}.ts`

**API Endpoint:**
- View: `backend/apps/{feature}/views.py` (add ViewSet method or new ViewSet)
- URL: `backend/apps/{feature}/urls.py` (register route)
- Serializer: `backend/apps/{feature}/serializers.py` (define request/response schema)

**Celery Task:**
- Task definition: `backend/apps/{feature}/tasks.py`
- Import in `backend/config/__init__.py` (ensure auto-discovery)
- Trigger from view or service: `task_name.delay(args)`

**WebSocket Consumer:**
- Consumer: `backend/apps/{feature}/consumers.py`
- Routing: `backend/apps/{feature}/routing.py`
- Register in `backend/config/asgi.py` ProtocolTypeRouter

## Special Directories

**backend/media:**
- Purpose: User-uploaded files (audio recordings)
- Generated: Yes (at runtime)
- Committed: No (in .gitignore)

**backend/staticfiles:**
- Purpose: Collected static assets for Django admin
- Generated: Yes (`python manage.py collectstatic`)
- Committed: No (in .gitignore)

**backend/.venv:**
- Purpose: Python virtual environment
- Generated: Yes (`python -m venv .venv`)
- Committed: No (in .gitignore)

**mobile/node_modules:**
- Purpose: npm dependencies
- Generated: Yes (`npm install`)
- Committed: No (in .gitignore)

**mobile/.expo:**
- Purpose: Expo build cache and generated types
- Generated: Yes (by Expo CLI)
- Committed: No (in .gitignore)

**mobile/android:**
- Purpose: Native Android build artifacts
- Generated: Yes (`expo prebuild`)
- Committed: Partial (gradle config committed, build/ ignored)

**.planning/codebase:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by GSD agents)
- Committed: Yes (version-controlled planning artifacts)

**.planning/phases:**
- Purpose: Implementation phase plans
- Generated: Yes (by GSD planner)
- Committed: Yes

---

*Structure analysis: 2026-02-13*
