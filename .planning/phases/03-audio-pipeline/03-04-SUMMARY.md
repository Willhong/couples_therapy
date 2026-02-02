---
phase: "03-audio-pipeline"
plan: "04"
subsystem: "conversations-unified"
tags: ["unified-list", "conversation-types", "tab-navigation", "FlatList", "pagination"]

requires:
  - "03-01 (audio models, transcription pipeline, Celery tasks)"
  - "02-04/05 (chat UI, tab navigation pattern)"

provides:
  - "Unified conversation list endpoint at /api/v1/conversations/"
  - "ConversationType field on Conversation model (text/narration/live)"
  - "Auto-creation of Conversation entries after audio transcription"
  - "Frontend ConversationList with type-aware cards and navigation"
  - "4-tab navigation layout (Home, Chat, Record, Insights)"

affects:
  - "03-05+ (consent flow, transcript viewer navigate from this list)"
  - "04-partner-engagement (shared conversations visible in list)"

tech-stack:
  added: []
  patterns:
    - "Page-number pagination on unified list endpoint"
    - "Type-aware navigation from conversation cards"
    - "Emotion intensity color dot indicator"
    - "Pull-to-refresh + infinite scroll FlatList"

key-files:
  created:
    - "backend/apps/conversations/__init__.py"
    - "backend/apps/conversations/apps.py"
    - "backend/apps/conversations/serializers.py"
    - "backend/apps/conversations/views.py"
    - "backend/apps/conversations/urls.py"
    - "backend/apps/chat/migrations/0002_conversation_conversation_type_and_more.py"
    - "mobile/src/features/conversations/types.ts"
    - "mobile/src/features/conversations/hooks/useConversations.ts"
    - "mobile/src/features/conversations/components/ConversationCard.tsx"
    - "mobile/src/features/conversations/components/ConversationList.tsx"
    - "mobile/src/features/conversations/index.ts"
  modified:
    - "backend/apps/chat/models.py"
    - "backend/apps/audio/tasks.py"
    - "backend/config/settings/base.py"
    - "backend/config/urls.py"
    - "mobile/src/app/(main)/home.tsx"
    - "mobile/src/app/(main)/_layout.tsx"

key-decisions:
  - decision: "Page-number pagination (not cursor) for unified list"
    rationale: "Simpler to implement; conversation list doesn't have real-time insertion issues"
  - decision: "Auto-create Conversation entry in transcribe_audio task"
    rationale: "Every completed recording should appear in unified list automatically"
  - decision: "4-tab layout with record and insights tabs enabled"
    rationale: "Record tab already has placeholder, insights deferred to later phase"

duration: "7m"
completed: "2026-02-03"
---

# Phase 3 Plan 4: Unified Conversation List Summary

**Backend unified list endpoint merging text chats + audio recordings + frontend ConversationList with type-aware cards and 4-tab navigation**

## Performance

| Metric | Value |
|--------|-------|
| Start | 2026-02-03T01:45:14+09:00 |
| End | 2026-02-03T01:52:05+09:00 |
| Duration | 7m |
| Tasks | 2/2 |

## Accomplishments

### Task 1: Backend unified conversation list endpoint
- Added ConversationType (text/narration/live), summary, and emotion_indicator fields to Conversation model
- Created apps.conversations Django app with unified_list view
- UnifiedConversationSerializer provides: id, type, type_display (Korean), title, summary, emotion_indicator, created_at, updated_at, last_message_preview, message_count, recording_id, post_action
- Page-number pagination (default 20, max 50) ordered by -updated_at
- Updated audio tasks.py to auto-create Conversation entry after successful transcription
- Registered in INSTALLED_APPS and wired URL at /api/v1/conversations/

### Task 2: Frontend conversation list and tab navigation
- Created ConversationEntry type with all API fields including recording_id and post_action
- useConversations hook with fetch, pagination state, pull-to-refresh, loadMore
- ConversationCard with type icon (chatbubble/mic/radio), Korean type badge, title, preview, relative date, emotion dot
- ConversationList FlatList with type-aware navigation: text -> chat, audio -> transcript
- Updated home.tsx: header + quick action buttons + ConversationList as main content
- Updated _layout.tsx: 4 tabs (Home, Chat, Record, Insights) with settings hidden
- Barrel export at features/conversations/index.ts

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 2a43988 | Backend unified conversation list endpoint |
| 2 | 71d88c0 | Frontend conversation list and tab navigation |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Page-number pagination for unified list | Simpler than cursor; list ordered by updated_at |
| Auto-create Conversation in transcribe_audio task | Every completed recording auto-appears in unified list |
| 4-tab layout (Home/Chat/Record/Insights) | Phase 3 enables recording tab; insights placeholder ready |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None significant.

## Next Phase Readiness

### For 03-05 (Consent Flow):
- Conversation list navigates to recording transcripts
- Audio recordings auto-linked to Conversations after transcription

### For 03-06/07 (Pattern Analysis, Insights):
- Insights tab visible in navigation, ready for implementation
- Conversation model has emotion_indicator for pattern tracking

### Blockers:
- None
