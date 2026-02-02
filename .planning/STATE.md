# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** 갈등 상황에서 상대방의 관점을 이해하도록 돕는 리프레이밍
**Current focus:** Phase 3 - Audio Pipeline (in progress)

## Current Position

Phase: 3 of 4 (Audio Pipeline)
Plan: 2 of 7 in current phase
Status: In progress
Last activity: 2026-02-03 - Completed 03-02-PLAN.md (Frontend Recording Feature)

Progress: [██████████░░░░░░] 63% (10/16 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: 8 min
- Total execution time: 77 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation & Safety | 4/4 | 32m | 8m |
| 2. Core Reframing | 5/5 | 39m | 8m |
| 3. Audio Pipeline | 2/7 | 6m+ | 6m |
| 4. Partner & Engagement | 0/2 | - | - |

**Recent Trend:**
- Last 5 plans: 8m, 8m, 8m, 8m, 6m
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Email-only auth (no username) | Simpler UX, removed username field entirely | 01-01 |
| Custom RegisterSerializer | dj-rest-auth's RegisterSerializer requires username | 01-01 |
| fernet_fields for encryption | djfernet package imports as fernet_fields | 01-01 |
| Korean error messages in API | User-facing errors in Korean as per CONTEXT.md | 01-01 |
| Expo SDK 54 with expo-router 6 | Upgraded for Expo Go compatibility, React 19.1, RN 0.81.5 | 01-02 |
| expo-secure-store for JWT | Hardware-backed storage (Keychain/Keystore) | 01-02 |
| Context API for auth state | Simpler than Redux for single concern | 01-02 |
| expo-clipboard for copy | Expo SDK compatible clipboard | 01-03 |
| DeepLinkHandler component | Access router inside providers | 01-03 |
| Korean error mapping | User-facing errors in Korean | 01-03 |
| JWT auth via query string for WebSocket | WebSocket API doesn't support custom headers | 01-04 |
| Channel groups scoped to couple_id | Ensures messages only go to connected partners | 01-04 |
| 5-minute consent expiration | Reasonable timeout for partner response | 01-04 |
| No skip button on tutorial | Per CONTEXT.md - mandatory tutorial for all users | 01-04 |
| drf-nested-routers for nested URLs | Clean /conversations/{id}/messages/ pattern | 02-01 |
| Messages immutable (no update/delete) | Per CONTEXT.md - messages permanent for accountability | 02-01 |
| UUID primary keys for chat models | Better for distributed systems and security | 02-01 |
| Latest 50 messages pagination | Performance while maintaining usability | 02-01 |
| LangChain for unified LLM interface | Provider abstraction enables switching without code changes | 02-02 |
| Two-mode single-call pipeline (replaced LangGraph) | 1 LLM call instead of 5; LLM chooses chat or reframing mode | 02-02 |
| Keyword safety pre-filter (replaced LLM safety check) | 0 LLM calls for severe abuse; instant static response | 02-02 |
| 10 recent messages verbatim in context | Balance between context preservation and token cost | 02-02 |
| Removed SSE entirely | React Native doesn't support ReadableStream; regular HTTP used | 02-02 |
| OpenRouter LLM provider | Multi-model access via unified API (Claude, GPT, Llama, etc.) | 02-02 |
| @react-native-community/slider | Native slider component for attachment scale | 02-03 |
| features/onboarding/ structure | Scalable feature-based organization | 02-03 |
| Zod + @hookform/resolvers | Type-safe validation with TypeScript | 02-03 |
| Custom chat UI (removed GiftedChat) | GiftedChat caused infinite re-render loops in RN 0.81 | 02-04/05 |
| Tab navigation for home/chat | Better UX for main app navigation | 02-04 |
| Feature-based chat folder structure | Consistent with onboarding pattern | 02-04 |
| Regular HTTP instead of SSE | React Native fetch doesn't support ReadableStream | 02-05 |
| POST as upsert for singleton ViewSets | Profile/Goals are one-per-user; POST acts as update | 02-05 |
| Redis db 1 for Celery broker | Separate from channels layer (db 0) | 03-01 |
| OpenAI direct API for transcription | Transcription not available via OpenRouter | 03-01 |
| gpt-4o-transcribe model | Latest OpenAI model with Korean language support | 03-01 |
| Always delete audio after transcription | Privacy - raw audio never persisted | 03-01 |
| Comfort mode as explicit user choice | Not LLM mode selection, user picks comfort vs reframe | 03-01 |
| View-based waveform (not SVG/Reanimated) | Simpler, follows project pattern of state-driven UI | 03-02 |
| 100ms metering polling | Smooth waveform visualization without excessive CPU | 03-02 |
| Live recording mode disabled | Consent flow deferred to Plan 03-05 | 03-02 |

### Pending Todos

None yet.

### Bug Fixes (2026-01-24 ~ 2026-02-02)

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| GiftedChat infinite re-render | Unstable object refs + React 19 strictness | Replaced with custom FlatList-based chat UI |
| "스트리밍을 시작할 수 없습니다" | RN fetch doesn't support ReadableStream/getReader() | Changed to regular HTTP `/reframe/` endpoint |
| SSE JSON parsing error | Frontend expected plain text, backend sent JSON events | Updated to parse `{type: "status/complete"}` events |
| Duplicate messages saved | Frontend called saveUserMessage + backend reframe saved again | Backend `/reframe/` handles both; removed frontend duplicate |
| LLM 503 error | `.env` file not loaded (missing `env.read_env()`) | Added `env.read_env(BASE_DIR / '.env')` in settings |
| KeyError in SAFETY_CHECK_PROMPT | JSON `{}` interpreted as Python format placeholders | Escaped as `{{}}` in prompt strings |
| JSON parse failure | LLM returns ` ```json ``` ` code blocks | Improved regex extraction + find `{...}` fallback |
| Long press not working | No handler on MessageBubble | Added Pressable with `onLongPress` → clipboard copy |
| Onboarding POST 405 | ViewSets had http_method_names=['get','put','patch'] | Added 'post' + create() as upsert |

### Blockers/Concerns

**From Research (address in Phase 3+):**
- Korean legal requirements (PIPA compliance, recording consent laws) need validation
- Abuse screening protocols for digital context need expert consultation

**From Phase 2:**
- Prompt engineering for non-judgmental reframing needs iteration
- Cultural adaptation for Korean communication styles (nunchi) needs deeper research
- Partner-side receiving UI deferred to Phase 4

**From 01-01 Execution:**
- dj-rest-auth has deprecation warnings about allauth settings (library issue, not blocking)

## Session Continuity

Last session: 2026-02-03
Stopped at: Completed 03-02-PLAN.md (Frontend Recording Feature)
Resume file: None
