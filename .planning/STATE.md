# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** 갈등 상황에서 상대방의 관점을 이해하도록 돕는 리프레이밍
**Current focus:** Phase 1 - Foundation & Safety (COMPLETE - pending verification)

## Current Position

Phase: 1 of 4 (Foundation & Safety)
Plan: 4 of 4 in current phase
Status: Awaiting human verification
Last activity: 2026-01-23 - Completed 01-04-PLAN.md (Onboarding Tutorial & Dual Consent)

Progress: [████░░░░░░] 36%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 8 min
- Total execution time: 32 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation & Safety | 4/4 | 32m | 8m |
| 2. Core Reframing | 0/3 | - | - |
| 3. Audio Pipeline | 0/2 | - | - |
| 4. Partner & Engagement | 0/2 | - | - |

**Recent Trend:**
- Last 5 plans: 13m, 10m, 4m, 5m
- Trend: Improving

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
| Expo SDK 53 with expo-router | Latest stable, file-based routing, typed routes | 01-02 |
| expo-secure-store for JWT | Hardware-backed storage (Keychain/Keystore) | 01-02 |
| Context API for auth state | Simpler than Redux for single concern | 01-02 |
| expo-clipboard for copy | Expo SDK compatible clipboard | 01-03 |
| DeepLinkHandler component | Access router inside providers | 01-03 |
| Korean error mapping | User-facing errors in Korean | 01-03 |
| JWT auth via query string for WebSocket | WebSocket API doesn't support custom headers | 01-04 |
| Channel groups scoped to couple_id | Ensures messages only go to connected partners | 01-04 |
| 5-minute consent expiration | Reasonable timeout for partner response | 01-04 |
| No skip button on tutorial | Per CONTEXT.md - mandatory tutorial for all users | 01-04 |

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
Stopped at: Completed 01-04-PLAN.md (awaiting human verification)
Resume file: None
