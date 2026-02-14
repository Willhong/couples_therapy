# Roadmap: CouplesAI

## Milestones

- v1.0 MVP - Phases 1-4 + Post-4 (shipped 2026-02-08)
- v1.1 Intelligence & Launch - Phases 5-9 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4 + Post-4) - SHIPPED 2026-02-08</summary>

### Phase 1: Foundation & Safety
**Goal**: Users can securely create accounts, link with partners, and trust their sensitive data is protected.
**Requirements**: AUTH-01~04, SAFE-01, SAFE-03, SAFE-04
**Plans**: 4/4 complete

Plans:
- [x] 01-01-PLAN.md — Django backend: project setup, models, JWT auth
- [x] 01-02-PLAN.md — Expo frontend: project setup, auth screens
- [x] 01-03-PLAN.md — Partner invitation: deep links, code generation
- [x] 01-04-PLAN.md — Tutorial + recording consent with WebSocket

### Phase 2: Core Reframing
**Goal**: AI-powered chat with perspective reframing and onboarding.
**Requirements**: RECR-01, RECR-03, RECR-04, REFR-01~04, ONBD-01, ONBD-02
**Plans**: 5/5 complete

Plans:
- [x] 02-01-PLAN.md — Backend models & core API for onboarding and chat
- [x] 02-02-PLAN.md — Two-mode AI pipeline: conversational chat + structured reframing
- [x] 02-03-PLAN.md — Onboarding questionnaire UI
- [x] 02-04-PLAN.md — Chat interface with streaming responses
- [x] 02-05-PLAN.md — Reframing modal and partner sharing

### Phase 3: Audio Pipeline
**Goal**: Recording, transcription, speaker separation, pattern detection.
**Requirements**: RECR-02, CONF-01~04, PATN-01~03
**Plans**: 10/10 complete

Plans:
- [x] 03-01 through 03-10 (see git history for details)

### Phase 4: Partner & Engagement
**Goal**: Cool-down tools, daily prompts, topic library, partner features.
**Requirements**: ONBD-03, COOL-01~03, COMM-01~03
**Plans**: 5/5 complete

Plans:
- [x] 04-01 through 04-05 (see git history for details)

### Post-Phase 4: v1 Hardening
**Goal**: Crisis safety, legal compliance, partner UX, shared content.
**Plans**: 4/4 complete (WS2-04, WS2-05, WS3-02, WS3-03)

</details>

### v1.1 Intelligence & Launch (In Progress)

**Milestone Goal:** 축적형 치료 인텔리전스 시스템 구축 + 프로덕션 출시 준비. Chat Agent를 therapeutic listener로 전환하고, 다중 에이전트 분석 파이프라인으로 개인화된 인사이트 리포트를 제공한다.

- [x] **Phase 5: Foundation & Stack** - Fix 4 critical integration gaps and modernize dependencies
- [ ] **Phase 6: Infrastructure** - PostgreSQL migration and push notification system
- [ ] **Phase 7: Chat Agent** - Transform chat from analyzer to therapeutic listener
- [ ] **Phase 8: Analysis & Insights** - Multi-agent analysis pipeline and insight report delivery
- [ ] **Phase 9: Health Dashboard & Launch** - Health score, home dashboard, and production readiness

## v1.1 Phase Details

### Phase 5: Foundation & Stack
**Goal**: The existing analysis pipeline executes end-to-end without crashing, and all dependencies are current
**Depends on**: v1.0 complete
**Requirements**: FNDX-01, FNDX-02, FNDX-03, FNDX-04, FNDX-05, STAK-01, STAK-02
**Complexity**: Medium
**Success Criteria** (what must be TRUE):
  1. Analysis graph executes with unified agent signatures — calling graph.invoke() with a test state runs all agents without signature errors
  2. Event triggers fire in production code paths — ending a conversation or submitting a check-in dispatches the corresponding Celery task
  3. Backend runs under ASGI/Daphne without asyncio event loop crashes
  4. Importing chat_graph.py does not raise compilation errors (lazy compilation works)
  5. End-to-end test passes: trigger fires -> analysis graph runs -> InsightReport saved to database
**Plans**: 4 plans

Plans:
- [x] 05-01-PLAN.md -- Fix 6 analysis agent signatures + 4 integration bugs (FNDX-01)
- [x] 05-02-PLAN.md -- Wire event triggers, replace asyncio.run, lazy compile chat_graph (FNDX-02/03/04)
- [x] 05-03-PLAN.md -- Upgrade backend dependencies, verify mobile compatibility (STAK-01/02)
- [x] 05-04-PLAN.md -- End-to-end pipeline test (FNDX-05)

### Phase 6: Infrastructure
**Goal**: Production database and push notification delivery are operational
**Depends on**: Phase 5
**Requirements**: PROD-01, PROD-02, PROD-03
**Complexity**: Medium
**Success Criteria** (what must be TRUE):
  1. Application runs on PostgreSQL 16 with all existing data intact — encrypted fields (Fernet) decrypt correctly after migration
  2. Mobile app registers push tokens and backend stores them — POST /api/v1/push/register succeeds
  3. Backend can send a push notification to a registered device and it appears on the device
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md -- SQLite to PostgreSQL migration with encrypted field verification (PROD-01)
- [ ] 06-02-PLAN.md -- Mobile push notification configuration: Firebase, EAS, app.json (PROD-02, PROD-03)

### Phase 7: Chat Agent
**Goal**: Users experience the chat as a therapeutic listener that accumulates context across sessions, not an instant analyzer
**Depends on**: Phase 5 (working pipeline foundation), Phase 6 (push for downstream delivery)
**Requirements**: AGNT-01, AGNT-02, AGNT-03, AGNT-04, AGNT-05, AGNT-06, AGNT-07
**Complexity**: High — paradigm shift with UX risk (P1: removing immediate gratification)
**Success Criteria** (what must be TRUE):
  1. With ACCUMULATIVE_THERAPY_ENABLED=true, chat responds with empathy and follow-up questions first — no immediate multi-point analysis in the first response
  2. Chat automatically transitions through conversation phases (initial -> exploring -> deepening -> wrapping) based on message depth
  3. User sees insight readiness progress during conversation and receives a brief reflection summary when conversation ends
  4. AI responses reference user's personal context (attachment style, conflict style, recent patterns) when available
  5. With ACCUMULATIVE_THERAPY_ENABLED=false, chat behaves identically to v1.0 (backward compatible)
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Analysis & Insights
**Goal**: Background analysis pipeline produces personalized insight reports and delivers them to users
**Depends on**: Phase 5 (working analysis graph), Phase 7 (chat accumulates data)
**Requirements**: ANAL-01, ANAL-02, ANAL-03, ANAL-04, ANAL-05, ANAL-06, INSG-01, INSG-02, INSG-03, INSG-04, INSG-05
**Complexity**: High — 6-agent LangGraph pipeline, trigger logic, cost controls, privacy enforcement
**Success Criteria** (what must be TRUE):
  1. When trigger conditions are met (crisis/threshold/sufficiency/periodic), background analysis runs automatically and produces an InsightReport with pattern, emotion, balance, and resolution sections
  2. Ethics Guardian blocks reports that fail safety/bias checks — blocked reports are never shown to users
  3. User can view report list, open report detail, and mark reports as read — unread count badge updates correctly
  4. User receives push notification when a new report is ready
  5. Reports reference partner dynamics without quoting partner's private data — no direct partner data appears in any report field
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD

### Phase 9: Health Dashboard & Launch
**Goal**: Users see their relationship health at a glance on the home screen and the app is ready for App Store submission
**Depends on**: Phase 8 (reports for dashboard badges), Phase 6 (PostgreSQL for production)
**Requirements**: HLTH-01, HLTH-02, HLTH-03, HLTH-04, HLTH-05, HLTH-06, PROD-04, PROD-05
**Complexity**: Medium
**Success Criteria** (what must be TRUE):
  1. Home screen shows Health Score (0-100) with trend indicator (up/down/stable) and 30-day history is viewable
  2. Health score reflects 5 weighted components and computes daily — couple-level score averages both partners
  3. Dashboard displays today's recommended actions based on health score weaknesses (low mood -> gratitude prompt, high escalation -> easy activity)
  4. Home dashboard shows health score, today's tasks, unread report badge, and partner status in one screen
  5. App passes performance benchmarks (database indexed, queries optimized, Redis cache active) and App Store metadata is prepared

**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD
- [ ] 09-03: TBD

## Progress

**Execution Order:**
v1.0: 1 -> 2 -> 3 -> 4 -> Post-4
v1.1: 5 -> 6 -> 7 -> 8 -> 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Safety | v1.0 | 4/4 | Complete | 2026-01-23 |
| 2. Core Reframing | v1.0 | 5/5 | Complete | 2026-02-02 |
| 3. Audio Pipeline | v1.0 | 10/10 | Complete | 2026-02-08 |
| 4. Partner & Engagement | v1.0 | 5/5 | Complete | 2026-02-08 |
| Post-4. v1 Hardening | v1.0 | 4/4 | Complete | 2026-02-08 |
| 5. Foundation & Stack | v1.1 | 4/4 | Complete | 2026-02-13 |
| 6. Infrastructure | v1.1 | 0/TBD | Not started | - |
| 7. Chat Agent | v1.1 | 0/TBD | Not started | - |
| 8. Analysis & Insights | v1.1 | 0/TBD | Not started | - |
| 9. Health Dashboard & Launch | v1.1 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-23*
*v1.0 shipped: 2026-02-08 (32/32 requirements, 28 plans + 4 workstreams)*
*v1.1 roadmap added: 2026-02-13 (5 phases, 36 requirements mapped)*
*Depth: quick (5 phases for v1.1)*
