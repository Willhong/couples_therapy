# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** 갈등 상황에서 상대방의 관점을 이해하도록 돕는 리프레이밍
**Current focus:** Phase 2 - Core Reframing (in progress)

## Current Position

Phase: 2 of 4 (Core Reframing)
Plan: 4 of 5 in current phase
Status: In progress
Last activity: 2026-01-23 - Completed 02-04-PLAN.md

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
| LangGraph StateGraph for reframing | Modular pipeline with conditional routing for safety | 02-02 |
| Safety check routing (severe vs mild) | Severe cases get safety resources, mild get normal reframing | 02-02 |
| 10 recent messages verbatim in context | Balance between context preservation and token cost | 02-02 |
| SSE for streaming reframing | One-way streaming simpler than WebSocket for this use case | 02-02 |
| @react-native-community/slider | Native slider component for attachment scale | 02-03 |
| features/onboarding/ structure | Scalable feature-based organization | 02-03 |
| Zod + @hookform/resolvers | Type-safe validation with TypeScript | 02-03 |
| react-native-gifted-chat for chat UI | Mature library with good React Native support | 02-04 |
| Tab navigation for home/chat | Better UX for main app navigation | 02-04 |
| Feature-based chat folder structure | Consistent with onboarding pattern | 02-04 |

### Pending Todos

None yet.

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

Last session: 2026-01-23
Stopped at: Completed 02-04-PLAN.md
Resume file: None
