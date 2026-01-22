# Roadmap: CouplesAI

## Overview

CouplesAI delivers AI-powered couples therapy through four phases: establishing legal/ethical foundation with secure authentication, proving core reframing value with text-based interactions, adding audio recording and transcription capabilities, and finally implementing partner collaboration and engagement features. The journey prioritizes safety and privacy first (sensitive relationship data), validates the core value proposition (perspective reframing) second, then builds complexity.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation & Safety** - Secure auth, partner linking, abuse screening, data encryption
- [ ] **Phase 2: Core Reframing** - Text-based conflict logging with AI perspective reframing
- [ ] **Phase 3: Audio Pipeline** - Recording, transcription, speaker separation, audio analysis
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
- [ ] 01-01-PLAN.md — Django backend: project setup, models, JWT auth (Wave 1)
- [ ] 01-02-PLAN.md — Expo frontend: project setup, auth screens (Wave 2)
- [ ] 01-03-PLAN.md — Partner invitation: deep links, code generation (Wave 3)
- [ ] 01-04-PLAN.md — Tutorial + recording consent with WebSocket (Wave 4)

### Phase 2: Core Reframing
**Goal**: Users can log conflicts via text chat and receive AI-generated perspective reframing that helps them understand how their partner might have heard their words.
**Depends on**: Phase 1
**Requirements**: RECR-01, RECR-03, RECR-04, REFR-01, REFR-02, REFR-03, REFR-04, ONBD-01, ONBD-02
**Success Criteria** (what must be TRUE):
  1. User can describe conflict situation in chat format and see conversation history
  2. User receives "how your partner might have heard this" reframing for each entry
  3. User receives concrete next-action suggestions (not generic advice)
  4. AI response never assigns blame or declares who is right/wrong
  5. User can share analysis with partner at chosen privacy level (full/summary/none)
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

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
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

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
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 1.1 -> 1.2 -> 2 -> 2.1 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Safety | 0/4 | Planning complete | - |
| 2. Core Reframing | 0/3 | Not started | - |
| 3. Audio Pipeline | 0/2 | Not started | - |
| 4. Partner & Engagement | 0/2 | Not started | - |

---
*Roadmap created: 2026-01-23*
*Phase 1 re-planned: 2026-01-23 (Django backend)*
*Depth: quick (4 phases)*
*Coverage: 32/32 v1 requirements mapped*
