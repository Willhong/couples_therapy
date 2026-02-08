# Roadmap: CouplesAI

## Overview

CouplesAI delivers AI-powered couples therapy through four phases: establishing legal/ethical foundation with secure authentication, proving core reframing value with text-based interactions, adding audio recording and transcription capabilities, and finally implementing partner collaboration and engagement features. The journey prioritizes safety and privacy first (sensitive relationship data), validates the core value proposition (perspective reframing) second, then builds complexity.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation & Safety** - Secure auth, partner linking, abuse screening, data encryption
- [x] **Phase 2: Core Reframing** - Text-based conflict logging with AI perspective reframing
- [x] **Phase 3: Audio Pipeline** - Recording, transcription, speaker separation, audio analysis
- [ ] **Phase 4: Partner & Engagement** - Sharing features, cool-down tools, communication exercises

## Phase Details

### Phase 1: Foundation & Safety
**Goal**: Users can securely create accounts, link with partners, and trust their sensitive data is protected. Legal and ethical safeguards are in place before any therapy features.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, SAFE-01, SAFE-03, SAFE-04 (SAFE-02 deferred)
**Stack**: Django 5.x + DRF (backend), Expo SDK 53+ (mobile)
**Success Criteria** (what must be TRUE):
  1. User can create account with email/password and stay logged in across app restarts
  2. User can generate invite code and link with partner (verified connection visible to both)
  3. User sees and accepts "not therapy replacement" disclaimer before using app
  4. Recording consent prompt appears before any audio capture with both partners' explicit agreement
  5. User completes mandatory tutorial (coach-mark tour) after onboarding
**Plans**: 4 plans in 4 waves

Plans:
- [x] 01-01-PLAN.md — Django backend: project setup, models, JWT auth (Wave 1)
- [x] 01-02-PLAN.md — Expo frontend: project setup, auth screens (Wave 2)
- [x] 01-03-PLAN.md — Partner invitation: deep links, code generation (Wave 3)
- [x] 01-04-PLAN.md — Tutorial + recording consent with WebSocket (Wave 4)

### Phase 2: Core Reframing
**Goal**: Users can log conflicts via text chat and receive AI-generated perspective reframing that helps them understand how their partner might have heard their words.
**Depends on**: Phase 1
**Requirements**: RECR-01, RECR-03, RECR-04, REFR-01, REFR-02, REFR-03, REFR-04, ONBD-01, ONBD-02
**Stack**: anthropic SDK (Claude API), react-native-gifted-chat, react-hook-form + zod
**Success Criteria** (what must be TRUE):
  1. User can describe conflict situation in chat format and see conversation history
  2. User receives "how your partner might have heard this" reframing for each entry
  3. User receives concrete next-action suggestions (not generic advice)
  4. AI response never assigns blame or declares who is right/wrong
  5. User can share analysis with partner at chosen privacy level (full/summary/none)
**Plans**: 5 plans in 4 waves

Plans:
- [x] 02-01-PLAN.md — Backend models & core API for onboarding and chat (Wave 1)
- [x] 02-02-PLAN.md — Two-mode AI pipeline: conversational chat + structured reframing (Wave 2, re-architected)
- [x] 02-03-PLAN.md — Onboarding questionnaire UI for attachment style and goals (Wave 2)
- [x] 02-04-PLAN.md — Chat interface with streaming responses and suggestions (Wave 3)
- [x] 02-05-PLAN.md — Reframing modal and partner sharing with WebSocket (Wave 4)

### Phase 3: Audio Pipeline
**Goal**: Users can record conflicts via voice and receive transcription with speaker-separated analysis, enabling capture of actual arguments for deeper insight.
**Depends on**: Phase 2
**Requirements**: RECR-02, CONF-01, CONF-02, CONF-03, CONF-04, PATN-01, PATN-02, PATN-03
**Success Criteria** (what must be TRUE):
  1. User can record voice describing situation and see transcribed text
  2. User can record actual conflict (with partner consent) and see who-said-what transcript
  3. App correctly identifies which partner said which lines (speaker diarization)
  4. User sees recurring conflict themes highlighted across multiple entries
  5. User sees trigger words/phrases flagged (e.g., "you always", "you never")
**Plans**: 10 plans (7 core + 3 gap closure)

Plans:
- [x] 03-01-PLAN.md — Backend: Celery setup, audio models, transcription service, comfort mode (Wave 1)
- [x] 03-02-PLAN.md — Frontend: expo-av recording, waveform, preview, upload (Wave 1)
- [x] 03-03-PLAN.md — Transcript display: chat-bubble view, speaker assignment, audio player, post-actions (Wave 2)
- [x] 03-04-PLAN.md — Unified conversation list: backend endpoint + frontend list with tab update (Wave 2)
- [x] 03-05-PLAN.md — Live conflict recording: partner consent flow, diarized recording (Wave 3)
- [x] 03-06-PLAN.md — Pattern detection backend: models, LLM analysis, Celery tasks, API (Wave 3)
- [x] 03-07-PLAN.md — Insights dashboard: charts, trigger highlights, weekly summary (Wave 4)
- [x] 03-08-PLAN.md — Gap closure: Home/Record flow unification, back button (Wave 5, gap closure)
- [x] 03-09-PLAN.md — Gap closure: UI polish - button styling, prompt hints (Wave 5, gap closure)
- [x] 03-10-PLAN.md — Gap closure: Waveform performance optimization (Wave 5, gap closure)

### Phase 4: Partner & Engagement
**Goal**: Partners can collaborate on relationship improvement through shared tools, guided exercises, and structured communication prompts.
**Depends on**: Phase 3
**Requirements**: ONBD-03, COOL-01, COOL-02, COOL-03, COMM-01, COMM-02, COMM-03
**Success Criteria** (what must be TRUE):
  1. User can invite partner through in-app flow (completes partner linking from Phase 1)
  2. User can start cool-down timer with guided breathing/meditation during heated moments
  3. User receives daily conversation prompts; both partners must answer before seeing each other's response
  4. User can browse conversation topic library by category
  5. User receives prompt to re-engage after cool-down period ends
**Plans**: 5 plans in 2 waves

Plans:
- [x] 04-01-PLAN.md — Cool-down timer: backend model + API, frontend countdown + breathing guide (Wave 1)
- [x] 04-02-PLAN.md — Daily prompts: backend models + auto-assignment + seed data, frontend prompt card + reveal (Wave 1)
- [x] 04-03-PLAN.md — Topic library: browsable prompt library with category tabs (Wave 1)
- [x] 04-04-PLAN.md — Abuse screening (SAFE-02): safety assessment + risk scoring + crisis resources (Wave 1)
- [x] 04-05-PLAN.md — Polish: TODO fixes, infrastructure hardening, automated test foundation (Wave 2)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 1.1 -> 1.2 -> 2 -> 2.1 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Safety | 4/4 | ✓ Complete | 2026-01-23 |
| 2. Core Reframing | 5/5 | ✓ Complete | 2026-02-02 |
| 3. Audio Pipeline | 10/10 | ✓ Complete | 2026-02-08 |
| 4. Partner & Engagement | 5/5 | ✓ Complete | 2026-02-08 |

---
*Roadmap created: 2026-01-23*
*Phase 1 re-planned: 2026-01-23 (Django backend)*
*Phase 2 planned: 2026-01-23 (5 plans in 4 waves)*
*Phase 2 Plan 02 re-architected: 2026-02-02 (two-mode chat+reframing pipeline)*
*Phase 3 planned: 2026-02-03 (7 plans in 4 waves)*
*Phase 3 gap closure: 2026-02-04 (3 plans addressing UAT gaps)*
*Phase 3 complete: 2026-02-08 (10/10 plans, gap closure verified)*
*Phase 4 complete: 2026-02-08 (5/5 plans, all requirements implemented)*
*Depth: quick (4 phases)*
*Coverage: 32/32 v1 requirements mapped*
