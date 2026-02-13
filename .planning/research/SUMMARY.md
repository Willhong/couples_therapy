# Project Research Summary

**Project:** CouplesAI v1.1 - Intelligence & Launch Additions
**Domain:** AI couples therapy mobile app - accumulative intelligence layer
**Researched:** 2026-02-13
**Confidence:** HIGH

## Executive Summary

v1.1 transforms CouplesAI from a reactive per-message analysis tool into an accumulative therapy system that mirrors how real couples therapy works. The existing v1.0 foundation (Django 5.x + DRF backend, Expo SDK 54 mobile, LangChain 0.3 + LangGraph 0.2+ for AI, Redis/Celery for async processing) is architecturally sound and fully compatible with all planned v1.1 features. **Critical finding: almost everything needed is already installed.** The work is primarily architectural (new services, new graph topology, new models) not dependency-driven. Only three changes are required: (1) pin langgraph to >=0.2.60 for reliable fan-out conditional edges, (2) migrate development from SQLite to PostgreSQL (docker-compose already configured), and (3) wire push notifications (both expo-notifications and exponent-server-sdk already installed).

The paradigm shift from "analyze every message" to "listen across sessions, analyze when ready, deliver insights separately" introduces a critical UX risk: users lose immediate gratification (instant per-message analysis) and receive nothing tangible until days/weeks later when sufficient data accumulates. This is the single most dangerous pitfall in v1.1. Prevention requires bridge UX (micro-insights, visible accumulation progress, transparent communication about the new approach, ensuring first insight report arrives within 1 week for active users). The seven target features form a coherent intelligence layer: chat agent becomes therapeutic listener, data accumulates across all touchpoints (chat/audio/check-ins/patterns/activities), analysis triggers fire when data is sufficient, insights arrive in separate reports, health score gives daily at-a-glance view, recommendations bridge insight to action. No competitor (Maia, Lasting, Paired) offers this accumulative paradigm with cross-source multi-session analysis.

The technical implementation has clean boundaries: UserIntelligenceService (lightweight cached context for real-time chat, <100ms) versus TherapyDataCollector (comprehensive aggregation for background analysis, ~5 seconds). However, the existing code has 4 critical integration gaps that block v1.1: (1) agent signature mismatch (analysis_graph.py passes `(state, model)` but agents expect `state['model_factory']` callable), (2) sync/async mismatch (agents are async but graph uses sync `graph.invoke()`), (3) event triggers not wired (on_conversation_ended exists but never called), and (4) asyncio.run() event loop conflict under ASGI/Daphne (works in dev WSGI but crashes in production ASGI). The 6-agent analysis graph (Pattern + Emotion in parallel, then Balance, Resolution, Synthesizer, Ethics Guardian) multiplies production risk by 6: cascading failures, timeouts, runaway costs, or thread exhaustion could crash Celery workers or create unexpected API bills.

## Key Findings

### Recommended Stack

The v1.0 stack is production-ready for v1.1 with minimal changes. Django 5.x + DRF provides the REST API layer. Expo SDK 54 + expo-router 6 handle mobile navigation and UI. LangChain 0.3 + LangGraph 0.2+ orchestrate multi-agent AI pipelines. OpenRouter/OpenAI/Anthropic models provide LLM reasoning. Redis serves as cache (db 2), Celery broker (db 1), and Channels layer (db 0). Celery + celery-beat handle background tasks and periodic triggers. Fernet encryption (djfernet) secures all sensitive therapy content.

**Core technologies:**
- **langgraph >=0.2.60** (UPGRADE from >=0.2.0) — StateGraph for multi-agent pipelines, fan-out conditional edges for parallel agent execution. Current floor is dangerously low; 0.2.60+ stabilized list returns from route functions.
- **PostgreSQL 16** (MIGRATE from SQLite) — Native JSON operators for DailyHealthScore components, compound indexes for pattern queries, Row-Level Security for data isolation. Already in docker-compose; just switch DATABASE_URL.
- **expo-notifications + exponent-server-sdk** (ALREADY INSTALLED) — Mobile push notifications for insight report delivery and health score alerts. Requires Development Build (not Expo Go), FCM config for Android, APNs for iOS.
- **LangGraph StateGraph** (ALREADY INSTALLED) — 7-node analysis graph (collect_data -> parallel_analysis -> balance -> resolution -> synthesizer -> ethics -> save/block). 6-agent pipeline with conditional routing based on ethics approval.
- **UserIntelligenceService + Django Cache** (ALREADY IMPLEMENTED) — 1-hour cached user context (attachment style, conflict style, recent patterns) for real-time chat personalization. Signal-invalidated on profile/pattern/checkin updates.
- **TherapyDataCollector** (ALREADY IMPLEMENTED) — Comprehensive data aggregation from 9 sources across 7 apps: conversations, check-ins, patterns, audio insights, activities, cooldowns, weekly summaries, health scores, conflict info.
- **Celery Beat** (ALREADY CONFIGURED) — Periodic tasks: evaluate_analysis_triggers (daily 00:30 KST), compute_daily_health_scores (daily 00:00 KST), weekly_summary (weekly Monday).

### Expected Features

v1.1 is not about adding features users expect from competitors, but about transforming the paradigm from reactive (per-message) to accumulative (multi-session). The four table stakes ensure the intelligence upgrade doesn't break trust: (1) chat agent must feel like talking to a therapist not a search engine (empathy first, follow-up questions, no immediate analysis), (2) AI must know who you are (attachment style, conflict style, recurring topics), (3) insights must arrive as separate readable reports (not crammed into chat), and (4) safety must be preserved through the upgrade (keyword pre-filter, crisis detection, Ethics Guardian validation).

**Must have (table stakes):**
- **Chat agent as therapeutic listener (TS-1)** — Responds with empathy first, asks follow-up questions, does NOT immediately jump to analysis. Follows phases: rapport -> exploration -> deepening -> reflection. Feature flag routes to new chat_agent/chat_graph.py.
- **Personalized AI context (TS-2)** — AI references user's attachment style, conflict style, communication preferences. UserIntelligenceService assembles cached context snapshot (<100ms). Safety-gated: high-risk users get minimal context.
- **Insight delivery as separate report (TS-3)** — Report has title, summary, key insights (3-5 bullets), suggested actions, recommended activities. Two delivery channels: report screen (primary) and in-conversation (permission-based). Push notification when new report available.
- **Safety preservation (TS-4)** — Existing keyword pre-filter and crisis detection unchanged. Ethics Guardian validates every analysis output. Three-level safety: per-message (real-time), chat agent monitoring (emotional intensity), analysis safety (cross-source patterns).

**Should have (competitive differentiators):**
- **Accumulative multi-session insight reports (DF-1)** — No competitor does this. System collects data silently from all touchpoints. When sufficient data accumulates (3+ conversations, 60%+ information checklist, sufficient check-ins), 5 specialized agents analyze patterns/emotions/balance/resolution/ethics. Result stored as InsightReport.
- **Relationship Health Score 0-100 (DF-2)** — Dynamic daily score from 5 weighted components: mood (25%), escalation (25%), engagement (20%), pattern severity (15%), cooldown frequency (15%). Historical trend visible (30-day chart). Both individual and couple-level scores.
- **Three-tier analysis triggers (DF-3)** — Crisis/safety (immediate), threshold breach (mood decline, escalation spike, score drop), data sufficiency (enough accumulated data), plus periodic weekly scheduled. Ensures insights arrive when they matter.
- **Smart recommendations (DF-4)** — Map health score weaknesses to specific app content. Low mood -> gratitude prompts. High escalation -> lower-difficulty activities. Recurring topic (finance) -> finance-related daily prompts.
- **Home dashboard (DF-5)** — Health score + trend indicator, today's tasks (check-in, activity, prompt), report unread badge, partner connection status, quick-access to chat. Single-screen daily touchpoint.
- **Partner data referenced but never quoted (DF-6)** — Analysis can infer partner perspective from user's own words, but never quotes partner's private data. Queryset-level isolation: partner's Pattern records never loaded for the other partner.

**Defer (v2+):**
- In-conversation insight delivery refinement (get report screen working first)
- Activity effectiveness tracking (needs completion data)
- Prompt response alignment analysis (needs both partners active)
- Report filtering/sorting/tabs
- Advanced health score visualization

**Anti-features (explicitly exclude):**
- Per-message multi-agent analysis (expensive, shallow insights)
- In-conversation analysis without permission (feels interrupting)
- Real-time health score updates (creates anxiety during conflicts)
- Partner pattern content sharing (creates ammunition)
- Automated therapy recommendations without context
- Overly frequent insight reports (report fatigue)

### Architecture Approach

v1.1 adds an intelligence layer on top of v1.0's solid foundation without replacing any core components. The architecture maintains clean separation: real-time chat path (UserIntelligenceService, cached context, single LLM call, <3 seconds) versus background analysis path (TherapyDataCollector, comprehensive data, 6-agent pipeline, 30-120 seconds). Feature flag (ACCUMULATIVE_THERAPY_ENABLED) routes at pipeline level after safety pre-filter and context gathering, so both paths benefit from shared infrastructure.

**Major components:**

1. **Chat Agent (therapeutic listener)** — `chat_agent/chat_graph.py` with 4-node StateGraph: determine_phase (initial/exploring/deepening/wrapping) -> evaluate_checklist (6 boolean fields tracking conflict info) -> generate_response (THERAPEUTIC_LISTENER_PROMPT, 1 LLM call) -> build_result. Returns same contract as old pipeline for backwards compatibility but adds checklist_update and phase. Information state (ConflictInformation) tracks 6 dimensions: conflict_scenario, root_cause, user_emotions, partner_emotions, attempted_solutions, desired_outcome.

2. **Intelligence Data Layer** — UserIntelligenceService (real-time, cached 1hr, 6 ORM queries max, safety-gated) versus TherapyDataCollector (background, no cache, 9 data sources, full context regardless of risk). Signals bust cache on post_save of UserProfile, Pattern, DailyCheckIn, SafetyAssessment.

3. **Analysis Trigger Service** — 4-tier evaluation: (1) CRITICAL (safety/crisis/severe patterns) -> immediate, (2) THRESHOLD (escalation spike, mood decline, score drop >=15) -> within hours, (3) SUFFICIENCY (first-time, 3+ conversations, 60%+ checklist) -> next window, (4) PERIODIC (weekly Monday + has activity) -> scheduled. 48-hour cooldown between analyses prevents over-triggering.

4. **Multi-Agent Analysis Graph** — LangGraph StateGraph with 7 nodes: collect_data (TherapyDataCollector) -> parallel_analysis (pattern_analyst + emotion_interpreter) -> balance_mediator -> resolution_strategist -> report_synthesizer -> ethics_guardian -> conditional edge (approved -> save_report, blocked -> mark_blocked). Each agent makes 1 LLM call. Total 6-7 LLM calls per analysis run. State flows through TypedDict (AnalysisState) with encrypted content fields.

5. **Health Score Service** — Daily Celery task computes 5 components for each user: mood (14d avg mood * 5, max 25), escalation ((10 - avg) * 2.5, max 25), engagement (streak + activity rate, max 20), severity ((5 - avg) * 3, max 15), cooldown (inverse frequency, max 15). Couple averaging: (user_score + partner_score) / 2. Missing components get neutral 50% (not 0, which penalizes new users).

6. **Intelligence API** — 5 REST endpoints under /api/v1/intelligence/: report_list (GET), report_detail (GET :id), mark_read (POST :id/read), unread_count (GET), partner_dashboard (GET). InsightReport model stores encrypted analysis fields (pattern_analysis, emotion_analysis, balance_analysis, resolution_suggestions, report_summary). DailyHealthScore model stores daily score + components JSON.

7. **Mobile Intelligence** — Feature directory `mobile/src/features/intelligence/` with types, api, adapters, hooks (useReports, useReportDetail, useUnreadCount), components (ReportListItem, ReportDetailView). Adapter layer normalizes backend snake_case to frontend camelCase. Status normalization: completed + is_read=true -> 'read', completed + is_read=false -> 'generated'.

**Data flow:**
- Real-time chat: POST /chat/reframe -> crisis detection -> UserIntelligenceService (cached) -> ACCUMULATIVE_THERAPY_ENABLED? (YES -> chat_agent/chat_graph.py, NO -> TWO_MODE_SYSTEM_PROMPT) -> 1 LLM call -> save message -> analyze_patterns.delay() -> return response. Target <3 seconds.
- Background analysis: Celery Beat evaluate_analysis_triggers (daily 00:30) OR event on_conversation_ended -> AnalysisTriggerService.evaluate() -> 4-tier check -> dispatch_multi_agent_analysis.delay() -> InsightReport status='processing' -> run_analysis() -> graph.invoke() (7 nodes, 6-7 LLM calls) -> save_report/mark_blocked -> [GAP: push notification on complete]. Target 30-120 seconds.
- Health score: Celery Beat compute_daily_health_scores (daily 00:00) -> for each active user -> HealthScoreService.compute() (5 components, ORM queries) -> DailyHealthScore.update_or_create(). Target <10 seconds per user.

### Critical Pitfalls

The research identified 14 pitfalls across 3 severity levels. The 4 critical pitfalls could cause production outages, user harm, or rewrites.

1. **Removing immediate gratification without replacement value (P1)** — v1.0 gives instant per-message analysis. v1.1 replaces with therapeutic listener that only empathizes. Users feel app got worse. New users have zero data, get empathy-only chat with NO reports for potentially weeks. **Prevention:** Bridge UX with micro-insights (brief reflection at conversation end), transparent communication ("I'm now listening more carefully across sessions"), graduated transition (listener first 5-8 messages then lighter reframing), visible accumulation progress ("Insight readiness: 40%"), ensure first report within 1 week for active users. MUST be addressed in same phase as chat agent refactoring.

2. **LangGraph multi-agent pipeline production failures (P2)** — 6-agent graph multiplies production risk by 6. Each agent makes independent LLM call (timeout, malformed JSON, rate limits). LangGraph parallel execution creates threads -> "can't start a new thread" RuntimeError crashes Celery worker. 6 sequential-ish LLM calls = $0.10-0.30 per analysis run. Misconfigured triggers at scale explode costs. **Prevention:** Per-agent timeout (30s each, 180s total), cost ceiling (daily/hourly token budget), circuit breaker (3 consecutive failures -> stop 1 hour), separate Celery queue for analysis (isolate from real-time tasks), bounded thread pool (not unbounded), graceful degradation per-agent (work with missing outputs), shadow mode first (2 weeks without user delivery). MUST be addressed when building analysis graph.

3. **SQLite to PostgreSQL migration corrupting encrypted data (P3)** — Migration fails silently or corrupts Fernet-encrypted fields (EncryptedTextField) on 8 models: Message.content, ConversationSummary, InsightReport analysis fields. Binary data encoding differs (SQLite loose, PostgreSQL strict bytea). Standard dumpdata/loaddata can mangle binary fields. UUID primary keys have format differences (SQLite text without dashes, PostgreSQL native UUID). django-fernet-fields docs warn "won't be able to use simple AlterField operation". **Prevention:** Test migration with production-like data first, use custom Python script (Django ORM both ends handles encryption/decryption), verify FERNET_KEYS transfer (exact same keys, even 1 char difference means all data lost), exclude ContentTypes, disable signals during migration, UUID format verification, backup untouched SQLite for 30 days. MUST be completed before production deployment.

4. **asyncio.run() event loop conflict under ASGI/Daphne (P4)** — Existing views.py uses asyncio.run() to call async LLM pipeline from sync views. Works under WSGI (development) but crashes under ASGI (Daphne already configured in base.py). asyncio.run() creates NEW event loop; under ASGI loop already running -> RuntimeError. **Prevention:** Convert to async views NOW (Django 5.x native async def views), OR use sync_to_async/thread pool, test under Daphne before production, update Celery tasks too (gevent pool conflicts). MUST be resolved before ASGI deployment.

**Moderate pitfalls:**
- P5: Health score meaningless for new/sparse users (progressive disclosure, confidence indicator)
- P6: Partner data privacy leak through inference (strict one-way inference, no cross-referencing reports)
- P7: Korean LLM therapy prompt quality degradation (native speaker evaluation, cultural adaptation layer)
- P8: Feature flag combinatorial explosion (merge to single flag, removal plan)
- P9: Backend-frontend API contract drift (adapter pattern, contract tests, version envelope)
- P10: Push notification setup failures in Expo (dev build required, physical device testing, graceful fallback)

**Minor pitfalls:**
- P11: Celery beat scheduling collisions (stagger schedules, add jitter)
- P12: TherapyDataCollector N+1 query performance (prefetch, indexes, caching)
- P13: In-conversation insight delivery timing (only after natural pause, never during emotional distress)
- P14: Accumulative system memory leak in ConflictInformation state (cap list fields, rolling window)

## Implications for Roadmap

Based on combined research, the recommended build sequence must prioritize fixing existing code integration gaps before adding new features. The architecture has 4 critical gaps that block v1.1: agent signature mismatch, sync/async mismatch, event triggers not wired, asyncio.run() conflict. Phase 1 must make the existing code runnable before Phase 2 adds new features. The paradigm shift from reactive to accumulative requires simultaneous delivery of chat agent transformation + bridge UX to avoid removing value without replacement.

### Phase 1: Fix Foundation (Make existing code run)

**Rationale:** Cannot build any v1.1 features until the analysis pipeline executes without crashing. Four integration gaps block execution: (1) agent signatures expect different parameters than graph provides, (2) async agents called from sync graph.invoke(), (3) event triggers exist but never called, (4) asyncio.run() will crash in production ASGI. Retrofitting these after new features are built creates cascading rework.

**Delivers:**
- Agent signature fixes (sync, accept (state, model))
- Analysis graph wrapper alignment
- Lazy compilation in chat_graph.py
- Wire on_conversation_ended into chat views
- Wire on_checkin_submitted into checkins views
- Convert chat views to async def OR fix event loop properly
- End-to-end test: trigger -> analysis -> report save

**Addresses:** P2 (production failures), P4 (event loop conflict)

**Blocks:** All subsequent phases. Nothing works until this is complete.

**Research flag:** None (fixing existing code, not building new features).

### Phase 2: PostgreSQL Migration + Push Notifications

**Rationale:** Simplest infrastructure work. Unblocks mobile development. PostgreSQL migration MUST complete before production deployment. Push notifications enable insight report delivery value loop.

**Delivers:**
- PostgreSQL migration (custom ORM-based script, test migration first, FERNET_KEYS verification)
- DATABASE_URL switch to PostgreSQL in base.py
- Push notification backend (PushToken model, registration endpoint, notification service)
- Push notification mobile (registerForPushNotificationsAsync, notification handler at module top-level)
- Push notification wiring (trigger on InsightReport completion, health score alerts)
- Health score API endpoint (GET /intelligence/health-score/)

**Addresses:** P3 (migration corruption), P10 (push notification failures)

**Uses:** psycopg[binary] (already installed), expo-notifications (already installed), exponent-server-sdk (already installed)

**Blocks:** Phase 4 (mobile needs endpoints), Phase 5 (production requires PostgreSQL)

**Research flag:** None (infrastructure setup with well-documented patterns).

### Phase 3: Chat Agent Transformation + Bridge UX

**Rationale:** Core paradigm shift from analyzer to therapeutic listener. MUST include bridge UX in same phase to avoid removing value without replacement (P1 critical pitfall). New users need visible accumulation progress and micro-insights until first report arrives.

**Delivers:**
- Enable ACCUMULATIVE_THERAPY_ENABLED feature flag (routes to chat_agent/chat_graph.py)
- Bridge UX: brief reflection summary at conversation end
- Visible accumulation progress ("Insight readiness: 40% - 2 more conversations needed")
- Transparent communication ("I'm now listening more carefully across sessions")
- Graduated transition: listener 5-8 messages, then lighter reframing bridge
- Trigger threshold adjustment to ensure first report within 1 week for active users
- ConflictInformation persistence to DB (or JSON field on Conversation)
- Conversation end detection logic

**Addresses:** P1 (removing immediate gratification), TS-1 (therapeutic listener), DF-6 (information state tracking)

**Avoids:** P1 (most dangerous UX pitfall), P7 (Korean prompt quality degradation)

**Uses:** Existing chat_agent/ implementation, UserIntelligenceService (personalization)

**Blocks:** Nothing (can parallel with Phase 4)

**Research flag:** Korean prompt quality needs native speaker evaluation before flag-on. Cultural adaptation layer (nunchi, jeong, indirect communication) needs validation with Korean therapy experts.

### Phase 4: Analysis Pipeline + Insight Reports

**Rationale:** Builds on stable foundation from Phase 1. Chat agent (Phase 3) is listening and accumulating data. Now enable the analysis pipeline to produce insights. Shadow mode first (2 weeks) to validate costs, failure rates, quality before delivering to users.

**Delivers:**
- Analysis trigger evaluation (daily Celery beat, event triggers wired in Phase 1)
- Multi-agent analysis graph execution (fixed in Phase 1, now enable)
- InsightReport delivery via API (report_list, report_detail, mark_read)
- InsightDeliveryManager wiring into chat agent (permission-based in-conversation delivery)
- Shadow mode: run analysis for 2 weeks without user delivery
- Cost monitoring dashboard (track per-agent LLM calls, token usage, failures)
- Circuit breaker pattern (3 consecutive failures -> stop 1 hour)
- Graceful degradation per-agent (work with missing outputs)

**Addresses:** DF-1 (accumulative multi-session reports), DF-3 (trigger service), TS-3 (insight delivery), P2 (production failures)

**Uses:** TherapyDataCollector (comprehensive data), LangGraph StateGraph (6-agent pipeline), InsightReport model (encrypted storage)

**Avoids:** P2 (pipeline failures), P6 (partner privacy leak through inference)

**Blocks:** Phase 5 (reports must generate before dashboard shows them)

**Research flag:** Per-agent prompt engineering for non-judgmental reframing needs iteration. Verify Balance Mediator prompt only uses user's description of partner, never partner's own data. Test with real Korean conflict descriptions for prompt quality (P7).

### Phase 5: Health Score + Dashboard

**Rationale:** Builds on stable analysis pipeline. Health score computation is independent of analysis pipeline (uses raw data sources directly). Dashboard ties everything together: health score + today's tasks + report badge = daily touchpoint.

**Delivers:**
- HealthScoreService computation (5 components, weighted formula)
- DailyHealthScore Celery task (daily 00:00 KST)
- Progressive disclosure (don't show until 3 check-ins + 2 conversations)
- Confidence indicator ("Confidence: Low - based on 2 data points")
- Component-level visibility (which have data, which need more)
- RecommendationService (map score weaknesses to app content)
- Smart prompt selection (recurring topic -> related prompts)
- Home dashboard (score + trend, today's tasks, report badge, partner status)
- Mobile health score screen (current score, components, 30-day chart)

**Addresses:** DF-2 (health score 0-100), DF-4 (smart recommendations), DF-5 (home dashboard), P5 (cold start problem)

**Uses:** DailyCheckIn (mood), WeeklySummary (escalation), Streak + CoupleActivity (engagement), Pattern (severity), CoolDown (frequency)

**Avoids:** P5 (meaningless score for new users)

**Blocks:** Nothing (final feature completion)

**Research flag:** None (scoring formula and dashboard patterns well-documented).

### Phase 6: Production Readiness + Rollout

**Rationale:** Everything must work before enabling for all users. Feature flag allows gradual rollout. Monitoring ensures production issues caught early.

**Delivers:**
- ACCUMULATIVE_THERAPY_ENABLED=true in staging
- A/B testing (10% users, then 50%, then 100%)
- Monitoring: pipeline duration, success rates, cost per analysis, trigger distribution
- Celery worker isolation (separate queue for analysis tasks)
- Cost ceiling enforcement (daily/hourly token budget)
- Rate limit trigger evaluation (100 users per minute, not all at once)
- Korean prompt quality validation (native speaker evaluation)
- End-to-end acceptance testing against intelligence-acceptance-matrix.md
- Production ASGI deployment (Daphne) with async views (fixed in Phase 1)
- Feature flag removal plan (target 4 weeks after 100% rollout)

**Addresses:** P2 (production failures), P7 (Korean quality), P8 (flag explosion)

**Uses:** All components from Phases 1-5

**Avoids:** All critical and moderate pitfalls through monitoring and gradual rollout

**Blocks:** Nothing (final rollout)

**Research flag:** None (deployment and monitoring, standard patterns).

### Phase Ordering Rationale

**Why this order:**
1. Fix foundation first — cannot build features on broken code (4 integration gaps block execution)
2. PostgreSQL + push notifications next — infrastructure needed before features, unblocks mobile work
3. Chat agent transformation + bridge UX — deliver paradigm shift with safety net (avoid P1 value removal)
4. Analysis pipeline + insight reports — build on stable chat agent, shadow mode first
5. Health score + dashboard — tie everything together, create daily touchpoint
6. Production readiness — validate everything before full rollout

**Dependency chain:**
- Phase 1 (fix foundation) -> Phase 2 (infrastructure) -> Phase 3 (chat transformation) | Phase 4 (analysis pipeline) -> Phase 5 (health score) -> Phase 6 (rollout)
- Phases 3 and 4 can run in parallel after Phase 2 completes

**Pitfall avoidance:**
- Phase 1 addresses P2 (production failures), P4 (event loop conflict) by fixing existing code
- Phase 2 addresses P3 (migration corruption), P10 (push notification failures) before features depend on them
- Phase 3 addresses P1 (most dangerous UX pitfall) by delivering bridge UX simultaneously with chat transformation
- Phase 4 addresses P2 (pipeline failures) with shadow mode, circuit breaker, graceful degradation
- Phase 5 addresses P5 (cold start problem) with progressive disclosure and confidence indicators
- Phase 6 addresses all moderate pitfalls (P6-P10) through validation, monitoring, gradual rollout

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 1:** None (fixing existing code, patterns are clear from codebase analysis)

- **Phase 2:** PostgreSQL migration with encrypted fields + UUID primary keys needs dry-run test with production-like data. Push notification FCM/APNs configuration needs documentation review.

- **Phase 3:** Korean prompt quality for therapeutic listener needs native speaker evaluation before flag-on. Cultural adaptation layer (nunchi, jeong, chaekmyeon concepts) needs validation with Korean therapy experts. Test with real Korean conflict descriptions (not translated English).

- **Phase 4:** Multi-agent prompt engineering for non-judgmental reframing needs iteration. Balance Mediator prompt must only use user's description of partner, never partner's own data (P6 privacy). Shadow mode cost monitoring crucial before user delivery.

- **Phase 5:** None (health score computation and dashboard patterns well-documented in existing codebase and plans)

- **Phase 6:** None (deployment, monitoring, rollout patterns are standard)

**Phases with standard patterns (skip detailed research):**

- **Phase 2:** PostgreSQL migration is well-documented Django pattern. Push notifications have official Expo SDK 54 documentation.

- **Phase 5:** Health score computation is arithmetic over ORM queries. Dashboard composition is standard mobile UX. RecommendationService is rule-based mapping.

- **Phase 6:** Celery worker configuration, monitoring setup, feature flag gradual rollout are standard SRE practices.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All dependencies verified present in requirements.txt and package.json. Only change needed: langgraph pin upgrade from >=0.2.0 to >=0.2.60. PostgreSQL already in docker-compose. Push notification packages already installed. |
| Features | MEDIUM-HIGH | Table stakes and differentiators grounded in existing codebase analysis and competitor research. The accumulative paradigm is genuinely novel (no competitor offers this). But UX risk (P1 removing immediate gratification) needs careful handling. |
| Architecture | HIGH | Component boundaries verified through direct codebase analysis of all 15 Django apps and mobile feature code. Integration gaps identified and fixable. Two-tier intelligence (UserIntelligenceService vs TherapyDataCollector) is clean separation. |
| Pitfalls | HIGH | All 4 critical pitfalls supported by documented incidents: LangGraph production failures (GitHub issues #2873, #4620, #4927), asyncio.run() conflict (langchain #8494), encrypted migration risks (django-fernet-fields docs), UX value removal (established product design pattern). |

**Overall confidence:** HIGH

Research quality is strong due to:
- Direct codebase analysis of all 15 backend apps, all service implementations, mobile feature code, settings, Celery config, docker-compose
- Existing plans provide detailed specifications: accumulative-therapy-system.md, backend-intelligence-upgrade.md, multi-agent-therapy-pipeline.md
- Official documentation for all core technologies (Django 5.x, LangGraph 1.0.8, Expo SDK 54, expo-notifications)
- Documented production failures for LangGraph and asyncio patterns (GitHub issues)
- The code is 70% implemented — research validates existing work rather than proposing untested architecture

### Gaps to Address

**Technical gaps:**

- **Agent signature mismatch fix approach** — Two options: (A) convert agents to sync def + model parameter, or (B) convert graph to async with graph.ainvoke(). Codebase uses Celery tasks where sync is natural. Recommendation: Option A (sync agents). Gap: verify this doesn't break existing analysis graph tests.

- **Push notification channel configuration** — Android notification channels (high/default/low priority for Insight Reports/Daily Reminders/Partner Activity) need explicit configuration at app startup. Gap: exact channel IDs and importance levels need design decision.

- **Korean prompt temperature testing** — Pattern Analyst uses temperature 0.3 for consistency. Gap: verify this doesn't produce overly robotic Korean. May need 0.4-0.5 for natural Korean sentence ending variety.

**Domain gaps:**

- **Bridge UX specific design** — What exactly does "micro-insights" mean? Brief reflection summary? One-line observation? Gap: needs UX mockup before implementation. Recommendation: "Here's what I heard today: [3-sentence summary]" + "Your data is being analyzed: [progress %]" on conversation end screen.

- **First report timing guarantee** — "Within 1 week for active users" requires defining "active" and adjusting trigger thresholds. Gap: what's the minimum data for acceptable quality? Recommendation: 3 conversations + 5 check-ins + 2 activities = trigger SUFFICIENCY regardless of checklist %.

- **Korean cultural adaptation specifics** — Nunchi (reading the room), jeong (emotional bond), chaekmyeon (face-saving) are mentioned but not operationalized. Gap: how do these manifest in prompt engineering? Needs consultation with Korean relationship counselor for prompt review.

**Regulatory gaps:**

- **PIPA compliance for partner data inference** — Korean Personal Information Protection Act may require explicit consent for "Your anonymized patterns may be used to improve your partner's analysis". Gap: legal review needed for consent language and opt-out mechanism.

**How to handle during planning/execution:**

- Phase 1 planning: Decide agent signature fix approach (sync vs async), write migration tests before touching agent files
- Phase 2 planning: Document push notification channel design (IDs, priorities, user-facing strings), test migration dry-run with encrypted data
- Phase 3 planning: Design bridge UX mockup (conversation end screen, progress indicator, micro-insight format), adjust trigger thresholds for first report timing
- Phase 3 execution: Korean prompt quality validation with native speaker BEFORE turning on feature flag for real users
- Phase 4 execution: Shadow mode for 2 weeks to validate costs (set budget ceiling before enabling), monitor failure patterns per-agent
- Phase 6 planning: Korean cultural adaptation review with relationship counselor, PIPA legal review for partner data consent

## Sources

### Primary (HIGH confidence)

**Codebase Analysis:**
- Direct analysis of all files in backend/ (15 Django apps, all services, models, tasks, views, settings)
- Direct analysis of mobile/src/ (features, types, api, adapters, hooks, components)
- Existing plans: accumulative-therapy-system.md, backend-intelligence-upgrade.md, multi-agent-therapy-pipeline.md, frontend-intelligence-ui-gap-v1.md, intelligence-acceptance-matrix.md
- backend/requirements.txt, mobile/package.json — all dependencies verified present
- docker-compose.yml — PostgreSQL 16, Redis 7 already configured

**Official Documentation:**
- [LangGraph PyPI v1.0.8](https://pypi.org/project/langgraph/) — verified Feb 2026
- [LangGraph StateGraph docs](https://docs.langchain.com/oss/python/langgraph/quickstart) — verified Feb 2026
- [Django 5.x async views](https://docs.djangoproject.com/en/5.2/topics/async/) — verified
- [Expo Notifications SDK 54](https://docs.expo.dev/versions/latest/sdk/notifications/) — verified
- [Expo Push Notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) — SDK 54 specific
- [psycopg 3.3.2 documentation](https://www.psycopg.org/psycopg3/) — verified Feb 2026
- [django-fernet-fields documentation](https://django-fernet-fields.readthedocs.io/en/latest/) — encryption migration warnings

**Production Issues:**
- [LangGraph deployment timeout errors - GitHub #4620](https://github.com/langchain-ai/langgraph/issues/4620)
- [LangGraph thread exhaustion - GitHub #2873](https://github.com/langchain-ai/langgraph/issues/2873)
- [asyncio.run() event loop conflict - langchain #8494](https://github.com/langchain-ai/langchain/issues/8494)

### Secondary (MEDIUM confidence)

**Feature Research:**
- [Dartmouth Therapy Chatbot Trial (2025)](https://home.dartmouth.edu/news/2025/03/first-therapy-chatbot-trial-yields-mental-health-benefits) — therapeutic alliance comparable to human therapists
- [Wysa Therapeutic Alliance Study (Frontiers)](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2022.847991/full) — flexible conversational interface builds relational capacity
- [APA Personalized Mental Health Trends (2026)](https://www.apa.org/monitor/2026/01-02/trends-personalized-mental-health-care) — personalization as defining trend
- [Woebot Conversation Design Case Study](https://uxwritinghub.com/woebot-case-study-in-conversation-design-for-mental-health-products/) — listen-first philosophy

**Architecture:**
- [LangChain in Production: Beyond the Tutorials](https://medium.com/@kasimoluwasegun/langchain-in-production-beyond-the-tutorials-e7b7f2506572) — $127 bill from misconfigured pipeline
- [Scaling AI Agents in Django SaaS: LangGraph + Celery](https://medium.com/django-journal/scaling-ai-agents-in-django-saas-langgraph-celery-for-autonomous-workflows-at-1m-users-f6d7a274838c)
- [Django SQLite to PostgreSQL migration guide](https://gist.github.com/sirodoht/f598d14e9644e2d3909629a41e3522ad)
- [Making Expo Notifications Actually Work](https://medium.com/@gligor99/making-expo-notifications-actually-work-even-on-android-12-and-ios-206ff632a845)

**Pitfalls:**
- [Cold Start Problem in ML Explained](https://spotintelligence.com/2024/02/08/cold-start-problem-machine-learning/)
- [Feature Flag Best Practices 2025](https://octopus.com/devops/feature-flags/feature-flag-best-practices/)
- [Expo Push Notifications FAQ](https://docs.expo.dev/push-notifications/faq/)

### Tertiary (LOW-MEDIUM confidence)

**Korean LLM:**
- [Aligning LLMs for CBT: Proof-of-concept study (Frontiers)](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1583739/full)
- [Survey of LLMs in Psychotherapy](https://arxiv.org/html/2502.11095v1) — cognitive-affective gap in mental health contexts

**Competitive Context:**
- [Maia App (YC W24)](https://www.ycombinator.com/companies/maia) — voice analysis + daily activities, no accumulative multi-session analysis
- [Paired App MQoRS Study (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12001865/) — assessment-based relationship quality, not behavior-derived

---
*Research completed: 2026-02-13*
*Ready for roadmap: yes*
*Target: v1.1 Intelligence & Launch milestone*
