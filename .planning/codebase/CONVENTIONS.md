# Coding Conventions

**Analysis Date:** 2026-02-13

## Naming Patterns

**Files:**
- Backend Python: snake_case for modules - `serializers.py`, `views.py`, `models.py`
- Mobile TypeScript: PascalCase for components - `LiveConsentFlow.tsx`, `CheckInSection.tsx`
- Mobile TypeScript: camelCase for utilities - `api.ts`, `auth.ts`
- Mobile screens: kebab-case for routes - `sign-in.tsx`, `privacy-policy.tsx`

**Functions:**
- Backend Python: snake_case - `activity_list()`, `get_recommendations()`, `refresh_user()`
- Mobile TypeScript: camelCase - `handleRecordPress()`, `onTranscriptionComplete()`, `refreshUser()`
- React components: PascalCase - `LiveConsentFlow`, `AuthProvider`, `ConversationList`

**Variables:**
- Backend Python: snake_case - `couple_activity`, `recording_id`, `user_email`
- Mobile TypeScript: camelCase - `unreadCount`, `hasPartner`, `displayName`
- Constants: UPPER_SNAKE_CASE - `API_URL`, `WS_BASE_URL`, `DEFAULT_API_ERROR_MESSAGE`

**Types:**
- Backend Python classes: PascalCase - `Activity`, `CoupleActivity`, `AudioRecording`
- Mobile TypeScript interfaces: PascalCase - `User`, `AuthContextType`, `RecordingState`
- Mobile TypeScript types: PascalCase - `RecordingMode`, `RecordingStatus`, `PostTranscriptAction`

## Code Style

**Formatting:**
- Backend: Ruff (Python linter/formatter)
- Mobile: No explicit formatter config detected (relies on IDE defaults)
- Backend indentation: 4 spaces
- Mobile indentation: 2 spaces
- Line length: No strict enforcement detected

**Linting:**
- Backend: Ruff configured in `requirements.txt`
- Mobile: No eslint or prettier config at project root
- Backend imports sorted: standard library, third-party (Django/DRF), local apps

**Backend Python specific:**
- Use Django conventions for views: `@api_view` decorators with `@permission_classes`
- Use Django ORM QuerySets with `filter()`, `get()`, `objects.create()`
- Korean language strings for user-facing messages: `'활성화된 커플이 없습니다.'`
- English for code comments and docstrings

**Mobile TypeScript specific:**
- Strict mode enabled in `tsconfig.json`: `"strict": true`
- Path aliases configured: `@/*` maps to `src/*`
- React functional components with hooks (no class components)
- Explicit return types on component functions: `: React.ReactElement`

## Import Organization

**Backend Python order:**
1. Standard library imports: `import uuid`, `from django.db import models`
2. Third-party frameworks: `from rest_framework import status`, `from channels.generic.websocket import AsyncWebsocketConsumer`
3. Local app imports: `from apps.couples.models import Couple`, `from .models import Activity`
4. Relative imports last: `from .serializers import ActivitySerializer`

**Mobile TypeScript order:**
1. React imports first: `import React, { useState, useCallback }`
2. React Native imports: `import { View, Text, StyleSheet }`
3. Third-party libraries: `import axios from 'axios'`, `import { useRouter } from 'expo-router'`
4. Local imports with path alias: `import { api } from '@/lib/api'`, `import { useAuth } from '@/hooks/useAuth'`
5. Type imports: `import type { RecordingMode, TranscriptResult }`
6. Relative imports last: `import { colors, alpha } from '@/theme'`

**Path Aliases:**
- Mobile uses `@/*` for `src/*`
- No barrel files (index.ts exports) detected - direct imports preferred

## Error Handling

**Backend Python patterns:**
- Use try-except blocks for model queries: `try: activity = Activity.objects.get(...)` followed by `except Activity.DoesNotExist:`
- Return DRF Response with appropriate status codes: `Response({'detail': 'message'}, status=status.HTTP_404_NOT_FOUND)`
- Validation errors return 400, not found returns 404, unauthorized returns 401/403
- Model-level validation in models.py, view-level validation in views.py
- Use Django's `ValidationError` for model validation

**Mobile TypeScript patterns:**
- Use try-catch for async API calls
- Extract error messages with utility function: `getApiErrorMessage(error)`
- Default fallback messages for user display: `DEFAULT_API_ERROR_MESSAGE = '요청 처리 중 문제가 발생했습니다.'`
- Axios interceptors handle 401 token refresh automatically
- Console.error for non-critical failures: `console.error('Failed to load unread count:', error)`
- Alert.alert for user-facing errors requiring acknowledgment

## Logging

**Backend:**
- Python logging module (Django default)
- No explicit logger instances in sample code - uses print or Django's default logging

**Mobile:**
- Console methods: `console.error()`, `console.log()`
- No structured logging framework detected
- Errors logged before silently failing or showing user alerts

**Patterns:**
- Log before re-throwing: catch, log, then throw
- Silent failures for non-critical operations with console.error
- Critical failures use user-facing alerts (mobile) or HTTP error responses (backend)

## Comments

**When to Comment:**
- Module docstrings at file top (Python): `"""Views for activities API."""`
- Function docstrings for non-obvious behavior: `"""Get personalized activity and prompt recommendations. Cached for 6 hours per user."""`
- Complex logic inline: `# Get user's couple` before queryset
- TSDoc/JSDoc for complex TypeScript functions and interfaces
- NO comments for self-explanatory code

**JSDoc/TSDoc:**
- Used for exported types and interfaces in TypeScript
- Function parameter descriptions for complex APIs
- Return type descriptions when non-obvious
- Example in `api.ts`: `@param onSuccess`, `@param onFailure`

**Style:**
- Backend Python: Triple-quoted docstrings for modules/functions
- Mobile TypeScript: JSDoc comments `/** ... */` for exports
- Inline comments use `//` (TypeScript) or `#` (Python)

## Function Design

**Size:**
- Backend views typically 20-40 lines per endpoint
- React components 100-400 lines including styles
- Extract complex logic to services: `apps/activities/services/recommendations.py`
- Extract hooks for reusable state: `useLiveRecording()`, `useAuth()`

**Parameters:**
- Backend views use Django Request object: `def activity_list(request)`
- Destructure props in React components: `{ onTranscriptionComplete, onFallbackToNarration, onCancel }`
- Use TypeScript interfaces for complex props: `interface LiveConsentFlowProps`
- Limit to 3-5 parameters; use config objects for more

**Return Values:**
- Backend views return DRF Response objects: `Response(serializer.data)`
- React components return `React.ReactElement`
- Hooks return objects or arrays: `const { user, loading, signIn } = useAuth()`
- Async functions return Promises: `Promise<void>`, `Promise<User>`

## Module Design

**Backend Exports:**
- No explicit exports (Python imports from module)
- Public API defined by what's imported in `urls.py`
- Service classes in `services/` subdirectory
- Models in `models.py`, serializers in `serializers.py`, views in `views.py`

**Mobile Exports:**
- Named exports preferred: `export function LiveConsentFlow() {}`
- Default exports for screen components: `export default function Home()`
- Type exports: `export type RecordingMode = 'narration' | 'live'`
- Interface exports: `export interface User { ... }`

**Barrel Files:**
- Not heavily used
- Features export components directly from subdirectories
- No `index.ts` files for re-exports detected in samples
- Direct imports: `import { ConversationList } from '@/features/conversations'`

## Django-specific Conventions

**Models:**
- Use `models.UUIDField(primary_key=True, default=uuid.uuid4)` for primary keys
- Use `models.TextChoices` for enum fields: `class Status(models.TextChoices)`
- Verbose names in Korean: `verbose_name='제목'`
- Meta class defines `db_table`, `ordering`, `indexes`
- Encrypted fields use `fernet_fields`: `EncryptedTextField()`

**Views:**
- Function-based views with `@api_view` decorator
- Use `@permission_classes([IsAuthenticated])` for auth
- Query user's couple with `Q(user1=user) | Q(user2=user)`
- Return early for error cases (guard clauses)
- Serializer instantiation: `serializer = ActivitySerializer(queryset, many=True)`

**Serializers:**
- Inherit from `serializers.ModelSerializer`
- Define `class Meta` with `model` and `fields`
- Use `read_only=True` for computed fields
- Nested serializers for relationships: `activity = ActivitySerializer(read_only=True)`

## React/React Native Conventions

**Component Structure:**
1. Imports
2. Type definitions (props interfaces)
3. Component function
4. Hooks at top of component
5. Event handlers
6. Effects
7. Return JSX
8. StyleSheet at bottom

**Hooks:**
- Custom hooks in `src/hooks/` directory
- Context hooks: `useAuth()`, `usePartner()`
- Feature-specific hooks in feature subdirectories
- Always use TypeScript return types
- Use `useCallback` for event handlers passed to children
- Use `useMemo` sparingly (not in samples)

**Styling:**
- StyleSheet.create at bottom of file
- Inline styles only for dynamic values
- Color constants from theme: `colors.primary`, `colors.bgPage`
- Typography helpers: `headingFont` from `@/theme/typography`
- Utility functions: `alpha(color, opacity)` for transparency

**State Management:**
- React Context for global state (auth, partner)
- Local useState for component state
- No external state management library (Redux, Zustand, etc.)
- WebSocket state in custom hooks: `useLiveRecording()`

---

*Convention analysis: 2026-02-13*
