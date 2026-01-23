---
phase: 02-core-reframing
plan: 01
subsystem: api
tags: [django, rest-api, onboarding, chat, encryption, fernet]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: User model with onboarding_completed field, Couple model
provides:
  - UserProfile model for attachment style storage
  - UserGoals model for relationship goals
  - Conversation and Message models for chat history
  - Chat REST API endpoints
  - Encrypted message storage with EncryptedTextField
affects: [02-02-claude-integration, 02-03-frontend-chat, 04-partner-sharing]

# Tech tracking
tech-stack:
  added: [drf-nested-routers]
  patterns: [nested-viewsets, encrypted-model-fields]

key-files:
  created:
    - backend/apps/onboarding/models.py
    - backend/apps/onboarding/serializers.py
    - backend/apps/onboarding/views.py
    - backend/apps/onboarding/urls.py
    - backend/apps/chat/models.py
    - backend/apps/chat/serializers.py
    - backend/apps/chat/views.py
    - backend/apps/chat/urls.py
  modified:
    - backend/config/settings/base.py
    - backend/config/urls.py
    - backend/requirements.txt

key-decisions:
  - "drf-nested-routers for /conversations/{id}/messages/ nested route"
  - "Messages immutable - no update/delete endpoints per CONTEXT.md"
  - "EncryptedTextField from fernet_fields for Message.content"
  - "Paginate messages to latest 50 in ConversationDetailSerializer"

patterns-established:
  - "Korean error messages for validation (e.g., '불안 애착 수준은 1에서 5 사이여야 합니다.')"
  - "UUID primary keys for chat models (conversation, message, summary, shared)"
  - "Nested viewsets for resource hierarchy"

# Metrics
duration: 7min
completed: 2026-01-23
---

# Phase 02 Plan 01: Backend Models and APIs Summary

**Django backend models for onboarding (UserProfile, UserGoals) and chat (Conversation, Message, ConversationSummary, SharedReframing) with REST API endpoints and encrypted message storage**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-23T14:45:13Z
- **Completed:** 2026-01-23T14:52:28Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Created onboarding app with UserProfile (attachment style, conflict style) and UserGoals (primary goal, focus areas) models
- Created chat app with Conversation, Message, ConversationSummary, and SharedReframing models
- Implemented REST APIs with proper authentication, ownership checks, and Korean error messages
- Message content encrypted at rest using EncryptedTextField (fernet_fields)
- Nested router for messages within conversations using drf-nested-routers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create onboarding Django app with models and API** - `1f0d0dd` (feat)
2. **Task 2: Create chat Django app with models** - `040838b` (feat)
3. **Task 3: Create chat serializers and REST API** - `04805d0` (feat)

## Files Created/Modified

### Onboarding App
- `backend/apps/onboarding/models.py` - UserProfile and UserGoals models
- `backend/apps/onboarding/serializers.py` - Profile, goals, and complete serializers
- `backend/apps/onboarding/views.py` - ViewSets and API views
- `backend/apps/onboarding/urls.py` - URL routing
- `backend/apps/onboarding/admin.py` - Admin configuration

### Chat App
- `backend/apps/chat/models.py` - Conversation, Message, ConversationSummary, SharedReframing
- `backend/apps/chat/serializers.py` - Serializers with pagination and validation
- `backend/apps/chat/views.py` - ViewSets with ownership checks
- `backend/apps/chat/urls.py` - Nested routing with drf-nested-routers
- `backend/apps/chat/admin.py` - Admin configuration

### Configuration
- `backend/config/settings/base.py` - Added apps.onboarding and apps.chat to INSTALLED_APPS
- `backend/config/urls.py` - Added API routes for onboarding and chat
- `backend/requirements.txt` - Added drf-nested-routers

## Decisions Made

1. **drf-nested-routers for nested URLs** - Provides clean `/conversations/{id}/messages/` pattern without manual URL configuration
2. **Messages are immutable** - No update/delete endpoints per CONTEXT.md (messages permanent for accountability)
3. **Latest 50 messages pagination** - ConversationDetailSerializer limits messages for performance while maintaining usability
4. **UUID primary keys for chat models** - Better for distributed systems and security (non-sequential)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Onboarding and chat models ready for frontend integration (02-03)
- Chat models ready for Claude AI integration (02-02)
- SharedReframing model ready for partner sharing feature (Phase 4)
- All sensitive content fields use EncryptedTextField

---
*Phase: 02-core-reframing*
*Completed: 2026-01-23*
