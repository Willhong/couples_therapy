# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** 갈등 상황에서 상대방의 관점을 이해하도록 돕는 리프레이밍
**Current focus:** Phase 2 - Core Reframing (in progress)

## Current Position

Phase: 2 of 4 (Core Reframing)
Plan: 4 of 5 in current phase
Status: In progress
Last activity: 2026-02-02 - Re-executed 02-02-PLAN.md (two-mode architecture)

Progress: [████████░░] 73%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 8 min
- Total execution time: 63 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation & Safety | 4/4 | 32m | 8m |
| 2. Core Reframing | 4/5 | 31m | 8m |
| 3. Audio Pipeline | 0/2 | - | - |
| 4. Partner & Engagement | 0/2 | - | - |

**Recent Trend:**
- Last 5 plans: 5m, 7m, 8m, 8m, 8m
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
| @react-native-community/slider | Native slider component for attachment scale | 02-03 |
| features/onboarding/ structure | Scalable feature-based organization | 02-03 |
| Zod + @hookform/resolvers | Type-safe validation with TypeScript | 02-03 |
| react-native-gifted-chat for chat UI | Mature library with good React Native support | 02-04 |
| Tab navigation for home/chat | Better UX for main app navigation | 02-04 |
| Feature-based chat folder structure | Consistent with onboarding pattern | 02-04 |
| Custom chat UI (removed GiftedChat) | GiftedChat caused infinite re-render loops in RN 0.81 | 02-05 |
| Regular HTTP instead of SSE | React Native fetch doesn't support ReadableStream | 02-05 |
| OpenRouter LLM provider | Multi-model access via unified API (Claude, GPT, Llama, etc.) | 02-02 |

### Pending Todos

None yet.

### Bug Fixes (2026-01-24)

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

### Blockers/Concerns

**From Research (address in Phase 1):**
- Korean legal requirements (PIPA compliance, recording consent laws) need validation
- Abuse screening protocols for digital context need expert consultation

**From Research (address in Phase 2):**
- Prompt engineering for non-judgmental reframing needs iteration
- Cultural adaptation for Korean communication styles (nunchi) needs deeper research

**From 01-01 Execution:**
- dj-rest-auth has deprecation warnings about allauth settings (library issue, not blocking)

## Session Continuity

Last session: 2026-02-02
Stopped at: Completed 02-02-PLAN.md re-execution (two-mode architecture)
Resume file: None

### 02-02 Re-execution Notes
- Replaced 5-node LangGraph StateGraph with two-mode single-call pipeline
- LLM decides chat vs reframing mode per message (1 call instead of 5)
- Keyword safety pre-filter replaces LLM safety check (0 calls for severe abuse)
- Removed all dead SSE code from views and URLs
- Frontend updated to handle mode field in API response

### 02-05 Progress (prior session)
- [x] Task 1: Create reframing modal components
- [x] Task 2: Create sharing functionality with WebSocket
- [x] Task 3: Wire ChatScreen and chat route with ReframingModal
- [ ] Task 4: Checkpoint - Human Verification (pending)

### Bug Fix Session Notes (2026-01-24)
- Replaced react-native-gifted-chat with custom implementation
- Changed SSE streaming to regular HTTP (RN compatibility)
- Added OpenRouter provider for LLM flexibility
- Fixed multiple JSON parsing and environment loading issues
