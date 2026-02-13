# Architecture Patterns: v1.1 Intelligence Layer Integration

**Domain:** AI couples therapy mobile app -- v1.1 intelligence & launch features
**Researched:** 2026-02-13
**Confidence:** HIGH (based on direct codebase analysis of all 15 Django apps, all service implementations, mobile feature code, existing plans, and settings)

---

## Current Architecture Snapshot

Before describing how new components integrate, here is the verified state of every component mentioned in the research question.

### What Already Exists (Implemented)

| Component | Location | Status |
|-----------|----------|--------|
| InsightReport model | `apps/intelligence/models.py` | Complete -- 4 trigger tiers, encrypted analysis fields, delivery tracking |
| Analysis graph (LangGraph) | `apps/intelligence/services/analysis_graph.py` | Complete -- 7-node `StateGraph` with conditional ethics routing |
| 5 analysis agents + ethics + synthesizer | `apps/intelligence/services/agents/` | Complete -- async nodes, JSON parsing, Korean prompts |
| TherapyDataCollector | `apps/intelligence/services/data_collector.py` | Complete -- aggregates 9 data sources across 7+ apps |
| AnalysisTriggerService | `apps/intelligence/services/trigger_service.py` | Complete -- 4-tier evaluation (critical/threshold/sufficiency/periodic) |
| Intelligence Celery tasks | `apps/intelligence/tasks.py` | Complete -- `evaluate_analysis_triggers`, `on_conversation_ended`, `on_checkin_submitted`, `dispatch_multi_agent_analysis` |
| UserIntelligenceService | `apps/core/services/user_intelligence.py` | Complete -- cached context (1hr TTL), safety-gated, 6 ORM queries max |
| Cache invalidation signals | `apps/core/signals.py` | Complete -- busts cache on profile/pattern/checkin/safety save |
| HealthScoreService | `apps/patterns/services/health_score.py` | Complete -- 5-component composite (mood/escalation/engagement/severity/cooldown) |
| DailyHealthScore model | `apps/patterns/models.py` | Complete -- daily storage with components JSON |
| Health score Celery task | `apps/patterns/tasks.py` | Complete -- `compute_daily_health_scores` runs daily at midnight KST |
| Chat agent (therapeutic listener) | `apps/chat/services/chat_agent/` | Complete -- `chat_graph.py`, `information_state.py`, `insight_delivery.py` |
| Feature flag routing | `reframing_graph.py` lines 159-168 | Complete -- `ACCUMULATIVE_THERAPY_ENABLED` routes to chat agent |
| Feature flag setting | `config/settings/base.py` line 258 | Complete -- `env.bool('ACCUMULATIVE_THERAPY_ENABLED', default=False)` |
| Intelligence API views | `apps/intelligence/views.py` | Complete -- report_list, report_detail, mark_read, unread_count, partner_dashboard |
| Intelligence URLs | `apps/intelligence/urls.py` | Complete -- 5 endpoints under `/api/v1/intelligence/` |
| Mobile intelligence feature | `mobile/src/features/intelligence/` | Complete -- types, api, adapters, hooks (useReports, useReportDetail, useUnreadCount), components (ReportListItem, ReportDetailView) |
| Celery Beat schedule | `config/celery.py` | Complete -- weekly summary, daily health scores, daily trigger evaluation |
| UserIntelligenceService call from chat | `apps/chat/views.py` lines 326-330 | Complete -- fetches context for both reframe and comfort endpoints |

### What Needs Work (Gaps Identified from Codebase)

| Gap | Details | Severity |
|-----|---------|----------|
| Agent signature mismatch | `analysis_graph.py` sync wrappers pass `(state, model)` but agent files (`pattern_analyst.py`, etc.) expect `state['model_factory']` callable and use `await model.ainvoke()` | CRITICAL |
| Sync/async mismatch in analysis graph | `analysis_graph.py` uses `graph.invoke()` (sync) but agent nodes are `async def` | CRITICAL |
| Missing event trigger wiring | `on_conversation_ended` task exists in `intelligence/tasks.py` but is never called from `chat/views.py` | HIGH |
| No push notification on report completion | `InsightDeliveryManager` exists but no push trigger when report completes | MODERATE |
| No health score API endpoint | `HealthScoreService` computes scores but no dedicated REST view to expose them to mobile | MODERATE |
| InsightDeliveryManager not wired to chat | `insight_delivery.py` exists but `chat_graph.py` never calls it | MODERATE |
| ConflictInformation not persisted | `ChatAgentState` exists only in memory per-request; no cross-session persistence | MODERATE |
| No mobile health score screen | Mobile has report screens but no health score display | LOW |

---

## Recommended Architecture: Integration Map

### System Overview (How Everything Connects)

```
MOBILE (Expo SDK 54)                     BACKEND (Django 5.x + DRF)
========================                 ================================

[Chat Screen]                            [Chat App]
  |                                        |
  |--POST /chat/reframe/------------>      reframing_graph.py
  |                                          |
  |                                          +-- ACCUMULATIVE_THERAPY_ENABLED?
  |                                          |     NO  --> TWO_MODE_SYSTEM_PROMPT (1 LLM call)
  |                                          |     YES --> chat_agent/chat_graph.py (1 LLM call)
  |                                          |               |
  |                                          |               +-- UserIntelligenceService.get_ai_context()
  |                                          |               |     (sync, cached 1hr, safety-gated)
  |                                          |               |
  |                                          |               +-- InsightDeliveryManager [GAP: not wired]
  |                                          |               |     (check pending insights, offer in chat)
  |                                          |               |
  |                                          |               +-- information_state.py tracking
  |                                          |
  |                                          +-- analyze_patterns.delay() [Celery]
  |                                          +-- on_conversation_ended.delay() [GAP: not called]
  |
[Report Screen]                          [Intelligence App]
  |                                        |
  |--GET /intelligence/reports/-------->   views.report_list
  |--GET /intelligence/reports/:id/---->   views.report_detail
  |--POST /intelligence/reports/:id/read-> views.mark_read
  |--GET /intelligence/reports/unread----> views.unread_count
  |                                        |
  |                                      [Celery Worker]
  |                                        |
  |                                        +-- evaluate_analysis_triggers (daily beat, 00:30 KST)
  |                                        |     |
  |                                        |     +-- AnalysisTriggerService.evaluate(user_id)
  |                                        |           |
  |                                        |           +-- _check_critical_signals (safety/crisis/patterns)
  |                                        |           +-- _check_threshold_breach (escalation/mood/score)
  |                                        |           +-- _check_data_sufficiency (first-time analysis)
  |                                        |           +-- _check_periodic_schedule (weekly Monday)
  |                                        |
  |                                        +-- dispatch_multi_agent_analysis
  |                                        |     |
  |                                        |     +-- InsightReport.create(status='processing')
  |                                        |     +-- run_analysis() [BROKEN: sync/async mismatch]
  |                                        |           |
  |                                        |           +-- collect_data_node (TherapyDataCollector)
  |                                        |           +-- parallel_analysis_node
  |                                        |           |     +-- pattern_analyst [BROKEN: sig mismatch]
  |                                        |           |     +-- emotion_interpreter [BROKEN: sig mismatch]
  |                                        |           +-- balance_mediator
  |                                        |           +-- resolution_strategist
  |                                        |           +-- report_synthesizer
  |                                        |           +-- ethics_guardian
  |                                        |           +-- save_report / mark_blocked
  |                                        |           +-- [GAP: push notification on complete]
  |                                        |
  |                                        +-- on_conversation_ended (event, not wired)
  |                                        +-- on_checkin_submitted (event, wired TBD)
  |
[Dashboard Screen]                       [Health Score]
  |                                        |
  |--GET /intelligence/dashboard/------>   views.partner_dashboard
  |--GET /intelligence/health-score/-->    [GAP: no endpoint]
  |                                        |
  |                                      [Health Score Celery Task]
  |                                        +-- compute_daily_health_scores (daily, 00:00 KST)
  |                                              +-- HealthScoreService.compute()
  |                                              +-- DailyHealthScore.update_or_create()
```

### Component Boundaries

| Component | Responsibility | Location | Communicates With |
|-----------|---------------|----------|-------------------|
| **Chat Pipeline** | Real-time message processing (1 LLM call) | `apps/chat/services/` | UserIntelligenceService (sync read), patterns tasks (async fire), intelligence tasks (async fire) |
| **Chat Agent** | Therapeutic listener with information state tracking | `apps/chat/services/chat_agent/` | Chat Pipeline (delegated by feature flag), InsightDeliveryManager (pending) |
| **UserIntelligenceService** | Lightweight cached user context for real-time chat personalization | `apps/core/services/user_intelligence.py` | Chat views (sync caller), Django Cache (1hr TTL), Signal receivers |
| **TherapyDataCollector** | Comprehensive data aggregation for background analysis | `apps/intelligence/services/data_collector.py` | Analysis graph (first node), reads from 7+ Django apps |
| **AnalysisTriggerService** | Determine when multi-agent analysis should run | `apps/intelligence/services/trigger_service.py` | Celery Beat (periodic), Celery event tasks, InsightReport model |
| **Analysis Graph** | LangGraph multi-agent pipeline (5 agents + ethics + synthesizer) | `apps/intelligence/services/analysis_graph.py` | TherapyDataCollector, 6 agent modules, InsightReport model |
| **HealthScoreService** | Compute daily composite health scores (0-100) | `apps/patterns/services/health_score.py` | Celery Beat (daily), DailyHealthScore model, 5 data sources |
| **InsightDeliveryManager** | In-conversation insight delivery (offer + deliver + mark) | `apps/chat/services/chat_agent/insight_delivery.py` | InsightReport model (read), Chat agent (not yet wired) |
| **Intelligence API** | REST endpoints for reports and partner dashboard | `apps/intelligence/views.py` | InsightReport, DailyHealthScore, partner data, SafetyAssessment |
| **Mobile Intelligence** | Report list, detail, hooks, adapter layer | `mobile/src/features/intelligence/` | Backend REST API via typed adapters |
| **Feature Flag** | `ACCUMULATIVE_THERAPY_ENABLED` env variable | `config/settings/base.py` | Chat pipeline routing decision |

---

## Data Flow Detail

### Real-time Chat Path (per message, target < 3 seconds)

```
User sends message via POST /api/v1/chat/reframe/
  |
  v
views.reframe_message(request)
  |
  +-- Save user message to DB (Message model, encrypted content)
  |
  +-- Crisis detection: detect_crisis(user_message)
  |     |-- keyword matching (Korean crisis keywords)
  |     |-- If crisis: create CrisisEvent, return safety resources, STOP
  |
  +-- Context: ConversationContextManager(conversation_id).get_context_for_ai()
  |     |-- Last 10 messages verbatim
  |     |-- Summary of older messages (via summarization LLM, cached in ConversationSummary)
  |
  +-- Intelligence: UserIntelligenceService.get_ai_context(user.id)  [SYNC, CACHED]
  |     |-- Cache hit: return immediately (< 1ms)
  |     |-- Cache miss: 6 ORM queries
  |     |     +-- SafetyAssessment (risk_level, couple_features_enabled)
  |     |     +-- UserProfile (attachment anxiety/avoidance, conflict_style)
  |     |     +-- UserGoals (primary_goal, focus_areas)
  |     |     +-- Pattern categories (top 5 by count, last 30 days)
  |     |     +-- WeeklySummary (escalation_trend, trigger_frequency)
  |     |     +-- InsightSummary (avg escalation score)
  |     |-- Safety gating:
  |     |     high risk: attachment label only, no patterns
  |     |     moderate: no trigger phrases, no escalation details
  |     |     low: full context
  |
  +-- Pipeline: asyncio.run(run_reframing_pipeline(...))
  |     |
  |     +-- check_safety(user_message)  [0 LLM calls, keyword only]
  |     |     severe match: return safety template immediately
  |     |     mild match: flag, continue to LLM
  |     |
  |     +-- ACCUMULATIVE_THERAPY_ENABLED?
  |           |
  |           NO:  TWO_MODE_SYSTEM_PROMPT -> 1 LLM call -> parse JSON
  |           |    Mode decided by LLM: "chat" or "reframing"
  |           |
  |           YES: chat_agent/chat_graph.py -> 1 LLM call
  |                |-- determine_phase (initial/exploring/deepening/wrapping_up)
  |                |-- evaluate_checklist (6 boolean fields)
  |                |-- generate_response (THERAPEUTIC_LISTENER_PROMPT, 1 LLM call)
  |                |-- parse_response (JSON with message + checklist_update)
  |                |-- build_result (merge checklist updates into state)
  |                |
  |                Returns: {mode: 'chat', final_response, checklist_update, phase}
  |
  +-- Save AI message to DB
  +-- analyze_patterns.delay(conversation_id)  [fire-and-forget Celery task]
  +-- Return response to mobile client
```

### Background Analysis Path (triggered, 30-120 seconds)

```
TRIGGER SOURCES:
  (A) Celery Beat: evaluate_analysis_triggers runs daily at 00:30 KST
  (B) Event: on_conversation_ended.delay() after conversation closes
  (C) Event: on_checkin_submitted.delay() after daily check-in

TRIGGER EVALUATION: AnalysisTriggerService.evaluate(user_id)
  |
  +-- _within_cooldown: InsightReport exists within 48 hours? -> skip
  |
  +-- Priority-ordered checks:
  |   1. CRITICAL: CrisisEvent in 24hrs OR high-risk SafetyAssessment OR 3+ severity>=4 Patterns
  |   2. THRESHOLD: escalation_score >= 7 OR mood declining 3+ days OR health score drop >= 15
  |   3. SUFFICIENCY: first-time only, 3+ qualifying conversations, 3+ check-in days
  |   4. PERIODIC: weekly Monday + has recent activity
  |
  +-- If triggered: dispatch_multi_agent_analysis.delay(user_id, tier, reason)

ANALYSIS PIPELINE: dispatch_multi_agent_analysis (Celery task)
  |
  +-- Create InsightReport(status='processing', trigger_tier, trigger_reason)
  +-- Attach couple if exists
  +-- run_analysis(report_id, user_id, couple_id, tier, reason, lookback_days)
       |
       +-- build_analysis_graph().compile()  [lazy, cached]
       +-- graph.invoke(initial_state)  [SYNCHRONOUS within Celery worker]
            |
            +-- Node 1: collect_data_node
            |   TherapyDataCollector(user_id).collect_therapy_context(lookback_days)
            |   Queries: user_profile, mood_trajectory, conversation_summaries,
            |            accumulated_patterns, audio_insights, activity_engagement,
            |            weekly_summaries, health_score, conflict_info (cooldowns)
            |
            +-- Node 2: parallel_analysis_node (sequential in practice)
            |   pattern_analyst: recurring patterns, trigger analysis, escalation trend
            |   emotion_interpreter: emotional landscape, attachment dynamics
            |
            +-- Node 3: balance_mediator
            |   Integrates pattern + emotion analysis, checks for bias
            |
            +-- Node 4: resolution_strategist
            |   Generates action recommendations based on all analyses
            |
            +-- Node 5: report_synthesizer
            |   Creates report_title, report_summary, key_insights, suggested_actions
            |
            +-- Node 6: ethics_guardian
            |   Reviews for bias, safety, cultural appropriateness
            |   Result: approved=true/false
            |
            +-- Conditional edge:
                approved  -> save_report_node (update InsightReport, status='completed')
                blocked   -> mark_blocked_node (status='failed', ethics_review saved)
```

### Health Score Path (daily batch, < 10 seconds per user)

```
Celery Beat at midnight KST: compute_daily_health_scores()
  |
  +-- For each active couple:
  |     For each user in couple:
  |       HealthScoreService.compute(user_id, couple_id)
  |         |-- _mood_component (14d avg mood * 5, max 25)
  |         |-- _escalation_component ((10 - avg) * 2.5, max 25)
  |         |-- _engagement_component (streak + activity rate, max 20)
  |         |-- _severity_component ((5 - avg) * 3, max 15)
  |         |-- _cooldown_component (inverse frequency, max 15)
  |         |-- Couple averaging: (user_score + partner_score) / 2
  |       DailyHealthScore.update_or_create(user, date, score, components)
  |
  +-- For each solo user (no couple):
        Same computation without couple averaging
```

---

## Critical Integration Points: Detailed Analysis

### 1. Chat Pipeline <-> UserIntelligenceService [CONNECTED]

**Files:** `apps/chat/views.py` L326-330 + L617-619, `apps/core/services/user_intelligence.py`

**How it works:**
```python
# In views.py (both reframe_message and comfort_message):
user_context = None
try:
    from apps.core.services.user_intelligence import UserIntelligenceService
    user_context = UserIntelligenceService.get_ai_context(request.user.id)
except Exception as e:
    logger.warning(f"Failed to fetch user context: {e}")
```

**Data contract (UserIntelligenceService returns):**
```python
{
    'attachment_style': {'anxiety': int, 'avoidance': int, 'label': str},
    'conflict_style': str,
    'communication_frequency': str,
    'primary_goal': str,
    'focus_areas': list[str],
    'risk_level': 'low' | 'moderate' | 'high',
    'couple_features_enabled': bool,
    'recent_patterns': {          # None for high-risk
        'top_trigger_categories': list[str],
        'top_topics': list[dict],
        'escalation_trend': str,
        'avg_escalation_score': float,
    }
}
```

**Cache invalidation:** Signals on `post_save` of UserProfile, Pattern, DailyCheckIn, SafetyAssessment (in `apps/core/signals.py`).

### 2. Chat Pipeline <-> Chat Agent [CONNECTED via feature flag]

**Files:** `apps/chat/services/reframing_graph.py` L159-168, `apps/chat/services/chat_agent/chat_graph.py`

**Routing mechanism:**
```python
# In run_reframing_pipeline():
if getattr(django_settings, 'ACCUMULATIVE_THERAPY_ENABLED', False):
    from .chat_agent.chat_graph import run_chat_agent_pipeline
    return await run_chat_agent_pipeline(
        user_message=user_message,
        conversation_context=conversation_context,
        user_context=user_context,
    )
```

**Contract preserved:** Both pipelines return identical dict shape:
```python
{
    'mode': 'chat' | 'reframing',
    'final_response': str,
    'analysis': dict | None,
    'suggestions': list,
    'is_abuse_detected': bool,
    'safety_response': dict | None,
}
```

Chat agent also returns `checklist_update` and `phase`, which the view ignores (backwards compatible).

### 3. Chat Pipeline <-> Pattern Analysis [CONNECTED]

**File:** `apps/chat/views.py` L373-377

```python
# After saving AI response:
try:
    from apps.patterns.tasks import analyze_patterns
    analyze_patterns.delay(str(conversation.id))
except Exception as e:
    logger.warning(f"Failed to queue pattern analysis: {e}")
```

**Downstream effect:** Creates `Pattern` and `InsightSummary` records -> triggers `post_save` signals -> busts `UserIntelligenceService` cache -> next chat message gets fresh context.

### 4. Event Triggers <-> Intelligence Analysis [PARTIALLY CONNECTED]

**What exists:** `apps/intelligence/tasks.py` has `on_conversation_ended` and `on_checkin_submitted` tasks.

**What is missing:** Neither is called from anywhere in the codebase.

**Required wiring:**
```python
# In apps/chat/views.py, after conversation end detection:
from apps.intelligence.tasks import on_conversation_ended
on_conversation_ended.delay(str(conversation.id), str(request.user.id))

# In apps/checkins/views.py (or wherever check-ins are submitted):
from apps.intelligence.tasks import on_checkin_submitted
on_checkin_submitted.delay(str(request.user.id))
```

### 5. Analysis Graph <-> Agent Nodes [BROKEN -- requires fix]

**The problem in detail:**

`analysis_graph.py` defines sync wrapper functions:
```python
def parallel_analysis_node(state: AnalysisState) -> dict:
    pattern_model = _get_agent_model('pattern_analyst')
    result = {}
    result.update(pattern_node(state, pattern_model))  # passes (state, model)
    ...
```

But `agents/pattern_analyst.py` expects:
```python
async def pattern_node(state: dict) -> dict:
    model = state['model_factory']('pattern_analyst')  # expects factory in state
    response = await model.ainvoke(messages)            # async call
```

**Root cause:** The analysis graph was written to use sync wrappers with model injection, but the agent files were written independently expecting a different interface.

**Fix (recommended -- Option A, convert agents to sync):**
```python
# In each agent file (pattern_analyst.py, emotion_interpreter.py, etc.):
# Change from:
async def pattern_node(state: dict) -> dict:
    model = state['model_factory']('pattern_analyst')
    response = await model.ainvoke(messages)

# To:
def pattern_node(state: dict, model) -> dict:
    response = model.invoke(messages)
```

**Rationale:** The analysis graph runs inside a Celery worker where everything is synchronous. Using `graph.invoke()` (sync) is correct for this context. Making agents async would require `graph.ainvoke()` and `asyncio.run()` in the Celery task, adding complexity with no benefit.

### 6. InsightDeliveryManager <-> Chat Agent [NOT WIRED]

**What exists:** `insight_delivery.py` has four class methods:
- `check_pending_insights(user_id)` - finds undelivered reports
- `prepare_insight_offer(insight_summary)` - generates Korean offer text
- `deliver_insight(insight_id)` - formats report as chat text
- `mark_delivered(insight_id)` - marks as in_conversation_delivered

**What is missing:** `chat_graph.py` never calls any of these.

**Integration approach:**
```python
# Add a pre-check step in chat_graph.py or run_chat_agent_pipeline():
pending = InsightDeliveryManager.check_pending_insights(user_id)
if pending:
    # Inject into the LLM prompt context so the agent can naturally offer insights
    # Or add a separate graph node that checks and conditionally routes
```

### 7. Intelligence API <-> Mobile [CONNECTED, needs extension]

**Backend endpoints (existing):**
| Endpoint | View | Mobile Consumer |
|----------|------|-----------------|
| `GET /intelligence/reports/` | `report_list` | `getReports()` -> `useReports()` |
| `GET /intelligence/reports/:id/` | `report_detail` | `getReportDetail()` -> `useReportDetail()` |
| `POST /intelligence/reports/:id/read/` | `mark_read` | `markReportRead()` |
| `GET /intelligence/reports/unread-count/` | `unread_count` | `getUnreadCount()` -> `useUnreadCount()` |
| `GET /intelligence/dashboard/` | `partner_dashboard` | Not consumed yet |

**Needed endpoints:**
| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /intelligence/health-score/` | Current user's health score + trend + components | HIGH |
| `GET /intelligence/health-score/history/` | Last 30 days of health scores | MEDIUM |

---

## Patterns to Follow

### Pattern 1: Two-Tier Intelligence (UserIntelligenceService vs TherapyDataCollector)

**What:** Two separate services for user data, intentionally designed for different use cases.
**When:** Always maintain this separation. Never merge them.

```
UserIntelligenceService (REAL-TIME PATH)          TherapyDataCollector (BACKGROUND PATH)
-----------------------------------------------  -----------------------------------------------
Called synchronously from chat views              Called from Celery worker in analysis graph
Cached (1hr TTL, signal-invalidated)              No caching (needs fresh data each run)
Max 6 ORM queries when cache cold                 9+ data source queries
Safety-gated (high risk = minimal context)        Full data regardless of risk
Returns lightweight dict for prompt injection     Returns comprehensive therapy context
Target: < 100ms                                   Target: < 5 seconds
Runs on every message                             Runs max daily
```

### Pattern 2: Feature Flag Routing at Pipeline Level

**What:** `ACCUMULATIVE_THERAPY_ENABLED` env variable controls chat behavior.
**Where it routes:** `apps/chat/services/reframing_graph.py` line 161.

```python
if getattr(django_settings, 'ACCUMULATIVE_THERAPY_ENABLED', False):
    return await run_chat_agent_pipeline(...)
# else: old TWO_MODE pipeline
```

**Why this specific location:** The flag is checked AFTER safety pre-filter and context gathering, so both paths benefit from UserIntelligenceService context and crisis detection. The flag only changes the LLM interaction style (analyzer vs therapeutic listener).

### Pattern 3: Event-Driven Trigger Chain

**What:** User actions fire Celery tasks that evaluate analysis triggers.
**Flow:**
```
User sends message
  -> analyze_patterns.delay() [Celery]
      -> Creates Pattern + InsightSummary records
          -> post_save signal busts UserIntelligenceService cache

User ends conversation
  -> on_conversation_ended.delay() [Celery]
      -> AnalysisTriggerService.evaluate()
          -> If triggered: dispatch_multi_agent_analysis.delay()

User submits check-in
  -> on_checkin_submitted.delay() [Celery]
      -> AnalysisTriggerService.evaluate()
          -> Only CRITICAL/THRESHOLD tiers dispatched
```

### Pattern 4: Celery for Background LLM Work

**What:** All multi-LLM-call pipelines run in Celery workers.
**Why:** Chat endpoint must return in < 5 seconds. Multi-agent analysis takes 30-120 seconds (6-7 LLM calls).
**Current config:** `CELERY_TASK_ALWAYS_EAGER = True` in development (sync). `False` in production.

### Pattern 5: Encrypted Therapy Data

**What:** All sensitive content uses `EncryptedTextField` (djfernet).
**Already applied to:** Message.content, InsightReport analysis fields, ConversationSummary, InsightSummary.ai_summary, WeeklySummary.trend_text.
**Must apply to:** Any new fields storing therapy content.

### Pattern 6: Backend-Mobile Adapter Layer

**What:** Mobile uses an adapter layer to normalize backend snake_case to frontend types.
**Where:** `mobile/src/features/intelligence/adapters.ts`
**Contract:** Backend returns `BackendInsightReportSummary` (snake_case), adapter transforms to `InsightReportSummary` (camelCase). Status normalization: `completed` + `is_read=true` -> `'read'`, `completed` + `is_read=false` -> `'generated'`.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: asyncio.run() in Sync Django Views
**What:** `apps/chat/views.py` uses `asyncio.run()` to call async pipelines from sync views.
**Why bad:** Creates a new event loop each time. Under ASGI (Daphne), conflicts with the existing event loop. Fragile in production.
**Current state:** Works in dev because `CELERY_TASK_ALWAYS_EAGER=True` keeps everything in one thread.
**Instead:** Either make views async (`async def reframe_message()`) or keep pipelines sync. For the Celery analysis path, keep everything sync.

### Anti-Pattern 2: N+1 Queries in TherapyDataCollector
**What:** `_get_conversation_summaries()` loops over conversations and queries messages per conversation.
**Where:** `data_collector.py` lines 143-147.
**Instead:** Use `annotate()` to batch-count messages:
```python
conversations = Conversation.objects.filter(...).annotate(
    msg_count=Count('messages'),
    user_msg_count=Count('messages', filter=Q(messages__role='user')),
)
```

### Anti-Pattern 3: Module-Level Graph Compilation
**What:** `chat_graph.py` line 251 compiles graph at import time.
**Why bad:** Import errors crash the entire module. Prevents dynamic reconfiguration.
**Good example:** `analysis_graph.py` uses lazy compilation via `_get_compiled_graph()`.
**Fix:** Apply the same lazy pattern to `chat_graph.py`.

### Anti-Pattern 4: Direct Partner Data Quoting
**What:** Showing partner's specific words or detailed personal data.
**Constraint:** Partner data must be "referenced but never directly quoted."
**Good example:** `partner_dashboard` shows mood trends (aggregate) and activity counts, never specific check-in notes.
**Apply to:** Any new partner-facing features.

---

## Build Order (Dependency-Corrected)

Based on the gaps identified above, here is the dependency-aware build order.

### Phase 1: Fix Foundation (Make existing code run)

**Why first:** The analysis pipeline cannot execute due to sync/async mismatches. All downstream features depend on working analysis.

| Task | Files to Modify | Dependency |
|------|----------------|------------|
| Fix agent signatures: sync, accept `(state, model)` | `agents/pattern_analyst.py`, `emotion_interpreter.py`, `balance_mediator.py`, `resolution_strategist.py`, `report_synthesizer.py`, `ethics_guardian.py` | None |
| Fix analysis_graph.py wrappers | `analysis_graph.py` (align with agent signatures) | Agent fixes |
| Fix lazy compilation in chat_graph.py | `chat_agent/chat_graph.py` | None |
| Wire `on_conversation_ended` into chat views | `apps/chat/views.py` | None |
| Wire `on_checkin_submitted` into checkins | `apps/checkins/views.py` (or signals) | None |
| End-to-end test: trigger -> analysis -> report save | Test file | All above |

**Blocks:** Phase 2, 3, 4

### Phase 2: Health Score API + Push Notifications

**Why second:** Simplest new features. Unblock mobile work.

| Task | Files to Modify/Create | Dependency |
|------|----------------------|------------|
| Add health score API endpoint | `apps/intelligence/views.py`, `urls.py`, `serializers.py` | None |
| Push notification on report completion | `analysis_graph.py` save_report_node, `apps/core/notifications.py` | Phase 1 (reports must generate) |
| Push notification on health score alert | `apps/patterns/tasks.py` compute_daily_health_scores | None |

**Blocks:** Phase 4 (mobile needs endpoints)

### Phase 3: Chat Agent Enhancement + Insight Delivery

**Why third:** Builds on working analysis pipeline.

| Task | Files to Modify | Dependency |
|------|----------------|------------|
| Wire InsightDeliveryManager into chat_graph | `chat_agent/chat_graph.py` | Phase 1 (reports exist to deliver) |
| Persist ConflictInformation to DB | New model or JSON field on Conversation | None |
| Conversation end detection logic | `apps/chat/views.py` or new signal | None |

**Blocks:** Nothing (can parallel with Phase 4)

### Phase 4: Mobile Intelligence Screens

**Why fourth:** Requires backend APIs from Phase 2.

| Task | Files to Create/Modify | Dependency |
|------|----------------------|------------|
| Health score display component | `mobile/src/features/intelligence/` | Phase 2 (API endpoint) |
| Push notification deep linking | `mobile/src/services/notifications.ts` | Phase 2 (push notifications) |
| Report list badge/pull-to-refresh | `mobile/src/features/intelligence/components/` | None |

### Phase 5: Rollout + Production Readiness

**Why last:** Everything must work before enabling for users.

| Task | Details | Dependency |
|------|---------|------------|
| PostgreSQL migration | Switch from SQLite to PostgreSQL | All phases |
| `ACCUMULATIVE_THERAPY_ENABLED=true` | Enable in staging, then production | Phase 1, 3 |
| Monitoring: pipeline duration, success rates | Logging/metrics in analysis_graph.py | Phase 1 |
| Per-user feature flag (optional A/B) | Extend from env-level to user-level | Phase 1 |

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Chat response time | LocMemCache, < 1s | Redis cache (prod config exists), < 1s | Redis Cluster, CDN |
| Analysis pipeline | CELERY_TASK_ALWAYS_EAGER (sync) | 2-3 Celery workers | Dedicated analysis worker pool, priority queues by tier |
| Health score computation | Daily batch, < 1 min total | Daily batch, ~10 min | Partitioned batch by user_id hash, staggered |
| Trigger evaluation | Daily sweep, trivial | Daily sweep, ~5 min | Sharded evaluation, event-driven only (drop periodic sweep) |
| Database | SQLite (current dev) | PostgreSQL (prod config exists) | PostgreSQL + read replicas, pgbouncer |
| Cache | LocMemCache (dev) | Redis (production.py configured on db/2) | Redis Cluster |
| LLM API costs | ~$0.50/analysis (6-7 calls) | $5K/month | Rate limiting, cheaper models for lower tiers, caching common analyses |
| Push notifications | Direct Expo push | Batch via Celery | Dedicated notification worker, batching |

---

## Sources

- Direct codebase analysis of all files referenced in this document (HIGH confidence)
- `apps/intelligence/services/analysis_graph.py` -- verified LangGraph StateGraph pattern, sync `graph.invoke()` usage
- `apps/core/services/user_intelligence.py` -- verified Django cache pattern with signal invalidation
- `apps/chat/services/reframing_graph.py` -- verified feature flag routing mechanism
- `config/settings/base.py` -- verified all settings: Celery config, LLM config, feature flag, cache, trigger config
- `config/settings/production.py` -- verified Redis cache, PostgreSQL, Celery async mode
- `config/celery.py` -- verified Beat schedule for all periodic tasks
- `mobile/src/features/intelligence/` -- verified adapter pattern, API calls, hook implementations
- All 6 agent files in `apps/intelligence/services/agents/` -- verified signature mismatch
