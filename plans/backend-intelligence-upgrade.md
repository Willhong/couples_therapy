# Backend Intelligence Upgrade Plan (v3 - Accumulative Paradigm Alignment)
# CouplesAI: Connect All Data to Make the AI Actually Smart

> **Revision Notes (v3):** Aligns with `accumulative-therapy-system.md` paradigm shift. Key changes: Workstream A now targets the new **therapeutic listener chat agent** prompt (not `TWO_MODE_SYSTEM_PROMPT`), clarifies **UserIntelligenceService** as lightweight real-time context for chat (distinct from **TherapyDataCollector** for background analysis), adds cross-references to the accumulative system plan, aligns Workstream D with Resolution Strategist's role. Prior v2 changes (safety gates, prompt injection, solo-user handling, etc.) retained.
>
> **Companion Document:** [`accumulative-therapy-system.md`](./accumulative-therapy-system.md) — defines the overarching 5-layer architecture (Chat Agent → Data Collection → Trigger Service → Analysis Agents → Insight Delivery). This document handles **real-time personalization and derived intelligence** that operates alongside and feeds into that system.

## Context

CouplesAI collects rich user data across 16+ models (onboarding profiles, mood check-ins, patterns, activities, prompts, cooldowns, streaks, crisis events) but the AI operates in near-total isolation from this data. The current chat agent — whether in the existing single-call pipeline or the new therapeutic listener (see `accumulative-therapy-system.md` Task 1) — receives only conversation context (recent messages + rolling summary). This means a user with high attachment anxiety who fights about money every week gets the exact same empathetic response as a first-time user with no history.

**Goal:** Make every real-time AI interaction personalized and context-aware by connecting existing database data to the chat agent, and create derived intelligence (health scores, recommendations) from cross-referenced data. This plan covers **real-time personalization** — the **background multi-agent analysis** is covered in `accumulative-therapy-system.md`.

### Two Intelligence Services

This plan introduces **UserIntelligenceService** — a lightweight, synchronous service for real-time chat personalization. The accumulative system plan introduces **TherapyDataCollector** — a heavy, comprehensive aggregator for background analysis. These are intentionally separate:

| | UserIntelligenceService | TherapyDataCollector |
|---|---|---|
| **Purpose** | Real-time chat agent personalization | Background multi-agent analysis |
| **Speed** | < 200ms (cached, sync ORM) | Seconds (uncached, comprehensive) |
| **Data scope** | Profile + recent patterns + mood trend | ALL data sources across 14+ days |
| **Consumers** | Chat agent prompt, health score, recommendations | Analysis agents (Pattern, Emotion, Balance, Resolution) |
| **When called** | Every chat message (via cache) | Only when analysis trigger fires |
| **Location** | `core/services/user_intelligence.py` | `intelligence/services/data_collector.py` |

## Architecture Overview

```
Current Flow (single-call pipeline):
  user_message + conversation_history --> TWO_MODE_SYSTEM_PROMPT --> LLM --> response

Target Flow (with accumulative-therapy-system.md):
  [REAL-TIME — this document]
  user_message + conversation_history
    + user_profile_context (attachment style, conflict style, goals, communication_frequency)
    + pattern_context (recent triggers, recurring topics, escalation trend)  [SANITIZED]
    + mood_context (recent check-ins, trend direction, today's answers)
    + engagement_context (streak, cooldown frequency, activity completion)
    + safety_context (risk_level gates what data is included)
    --> PERSONALIZED CHAT AGENT PROMPT (therapeutic listener, safety-gated)
    --> LLM --> response (empathy + information gathering, NOT analysis)

  [BACKGROUND — accumulative-therapy-system.md]
  TherapyDataCollector (all sources, 14+ days)
    --> AnalysisTriggerService (evaluates sufficiency)
    --> Multi-agent analysis graph (5 agents)
    --> InsightReport (stored, delivered via chat or report screen)
```

The central new component is a **UserIntelligenceService** located at `backend/apps/core/services/user_intelligence.py` that assembles a user's real-time context snapshot from key data sources. This service is consumed by: (1) the chat agent prompt for personalization, (2) a new health score computation, (3) a new recommendation engine.

**Why `core/services/` not `chat/services/`:** The service queries across 6+ apps (users, onboarding, checkins, patterns, safety, cooldown). Placing it in `chat/` would create circular import risks and violates the principle that cross-cutting services belong in `core/`.

**Why not merge with TherapyDataCollector?** Different performance requirements. UserIntelligenceService is called on every chat message (must be < 200ms, cached). TherapyDataCollector runs only in background analysis (can take seconds, queries ALL data comprehensively). Merging them would either slow real-time chat or under-serve background analysis.

---

## Cross-Cutting Concerns (apply to ALL workstreams)

### CC1. Safety Gate for High-Risk Users (CRITICAL)
The `SafetyAssessment` model has `risk_level` ("low"/"moderate"/"high") and `couple_features_enabled` (boolean). These MUST gate all personalization:

| Risk Level | Allowed Context | Blocked Context |
|------------|----------------|-----------------|
| `low` | All context | None |
| `moderate` | Profile, goals, mood, engagement | Trigger phrases, escalation details |
| `high` | Attachment style label only, mood (no notes) | ALL pattern data, ALL trigger phrases, ALL escalation data, partner comparison |

Additionally: if `couple_features_enabled == False`, skip E2 partner dashboard and couple-level health score. Return individual-only data.

This gate is implemented in `UserIntelligenceService.get_ai_context()` and checked before any data assembly.

### CC2. Prompt Injection Sanitization (CRITICAL)
User-derived content (`Pattern.content`, `DailyCheckIn.note`, `DailyCheckIn.answers`) injected into system prompts MUST be sanitized:
- Strip any content resembling LLM instruction overrides (regex patterns: `[SYSTEM:`, `ignore previous`, `you are now`, `<system>`, etc.)
- Truncate individual values to max 50 characters
- Move user-derived verbatim content to the **human message context section** rather than the system message where possible
- The `build_personalized_prompt()` function uses category labels and counts (safe) rather than raw user text in the system prompt

### CC3. Solo User Handling
Users may have `couple=None` or couple in `pending` status. All services MUST handle this:
- A1: Return individual-only context (no partner patterns)
- B1: Compute individual mood correlations only
- C1: Compute individual health score only (skip couple averaging, cap at individual max)
- D1: Return individual-only recommendations (skip couple activities)
- E2: Return individual dashboard (no partner section)

### CC4. Async/Sync Boundary
`run_reframing_pipeline()` and `run_comfort_pipeline()` are `async` functions. `UserIntelligenceService.get_ai_context()` performs synchronous ORM queries. The wiring in views.py calls the sync service BEFORE entering the async pipeline. The context dict (plain Python dict) is passed as a parameter. **Do NOT call `get_ai_context()` inside async code without `sync_to_async`.**

### CC5. Encrypted Fields Handling
`InsightSummary.ai_summary` and `WeeklySummary.trend_text` use `EncryptedTextField` (fernet AES-256). When these fields are read, Django auto-decrypts them. Rules:
- Do NOT cache decrypted `ai_summary` or `trend_text` values in Redis/memcache
- For cached context dicts, use only derived/aggregated values (e.g., escalation score number, topic counts) — never raw encrypted field content
- Cache invalidation: bust user cache on profile save, pattern creation, check-in submission

### CC6. Database Indexes
Add indexes for new query patterns in a single migration:
- `Pattern`: compound index on `(user, pattern_type, created_at)` for filtered time-range queries
- `InsightSummary`: compound index on `(user, created_at)` for correlation lookups
- `DailyCheckIn`: already has `(user, date)` unique_together — sufficient
- `CoolDown`: index on `(user, started_at)` for time-range analytics (note: field is `started_at`, not `created_at`)

---

## Workstream A: Personalized AI Context Injection (HIGHEST PRIORITY)
**Gap Addressed:** Gaps 1, 3 -- Onboarding data never used; pattern data doesn't feed back into AI
**Dependencies:** Task 1 from `accumulative-therapy-system.md` (Chat Agent Refactoring) — the prompt target changes depending on whether the new therapeutic listener is deployed
**Estimated Files Changed:** 7-9

### Objective
Make the chat agent aware of who the user is and what patterns they exhibit, so every response is tailored rather than generic. Under the accumulative paradigm, this means personalizing the **therapeutic listener** (empathy calibration, questioning strategy) — not injecting analysis data for per-message responses.

> **Paradigm note:** The chat agent's role is listening and gathering information, NOT analyzing. Personalization here means the agent knows the user's attachment style to calibrate empathy, knows recurring topics to ask better questions, and knows mood trends to adjust tone — not to provide per-message analysis.

### Data Flow
```
UserProfile (attachment_anxiety, attachment_avoidance, conflict_style, communication_frequency)
  + UserGoals (primary_goal, focus_areas)
  + SafetyAssessment (risk_level, couple_features_enabled)  --> SAFETY GATE (CC1)
  + Pattern (recent trigger categories, top recurring_topics, latest escalation_score)  --> SANITIZED (CC2)
  + WeeklySummary (escalation_trend number only, not trend_text)
  --> UserIntelligenceService.get_ai_context(user_id)
  --> injected into chat agent prompt as structured Korean text
  --> consumed by:
      (a) New therapeutic listener chat agent (when ACCUMULATIVE_THERAPY_ENABLED=True)
      (b) Legacy run_reframing_pipeline() / run_comfort_pipeline() (when flag=False, fallback)
```

### Detailed Tasks

#### A1. Create UserIntelligenceService
- **New file:** `backend/apps/core/services/user_intelligence.py`
- **What it does:** Single service that queries across models to build a context snapshot dict:
  ```python
  {
    "attachment_style": {"anxiety": 4, "avoidance": 2, "label": "불안형"},
    "conflict_style": "avoid",
    "communication_frequency": "daily",  # NEW: from UserProfile
    "primary_goal": "improvement",
    "focus_areas": ["의사소통", "감정표현"],
    "risk_level": "low",
    "couple_features_enabled": True,
    "recent_patterns": {  # OMITTED entirely if risk_level == "high"
      "top_trigger_categories": ["비난", "방어"],  # categories only, not raw content
      "top_topics": [{"topic": "재정", "count": 5}, {"topic": "가사분담", "count": 3}],
      "escalation_trend": "improving",
      "avg_escalation_score": 4.2
    }
  }
  ```
- **Queries:** `UserProfile`, `UserGoals`, `SafetyAssessment` (OneToOneField per user — use `.get()` not `.first()`), `Pattern` (last 30 days, top 5 by frequency), `WeeklySummary` (latest — use `escalation_trend` and `trigger_frequency` fields only, NOT `trend_text` which is encrypted)
- **Safety Gate (CC1):** Check `SafetyAssessment.risk_level` first. If "high", return minimal context. If "moderate", exclude trigger/escalation details.
- **Solo Handling (CC3):** If no active couple, return individual-only context with `"couple_features_enabled": False`
- **InsightSummary Handling:** Query with `.exists()` check first. If no InsightSummary records exist (new user), omit pattern section entirely with graceful defaults.
- **Caching:** Results cached per user for 1 hour using Django cache framework. Cache key: `user_intelligence:{user_id}`. Invalidation: signal on `UserProfile.save()`, `Pattern.save()`, `DailyCheckIn.save()`, `SafetyAssessment.save()`.
- **Sync constraint (CC4):** This service uses synchronous ORM queries only. Must be called from sync context (views) not from async pipeline code.
- **Acceptance Criteria:**
  - Given a user_id, returns a complete context dict with all fields populated (or sensible defaults for missing data)
  - Returns empty/default context for users without onboarding data (graceful degradation)
  - Query count is bounded (no N+1 queries) — target: max 6 queries
  - High-risk users receive minimal context (verified by test)
  - No encrypted field content appears in cached values

#### A2. Create Dynamic System Prompt Builder
- **Modified file:** `backend/apps/chat/prompts/system_prompts.py` (legacy fallback) AND `backend/apps/chat/prompts/chat_agent_prompts.py` (new, from `accumulative-therapy-system.md` Task 1)
- **What it does:** Add a `build_personalized_prompt(base_prompt: str, user_context: dict) -> str` function that takes any base prompt and the context dict from A1, and returns a personalized system prompt by appending a `## 사용자 프로필` section.
  - When `ACCUMULATIVE_THERAPY_ENABLED=True`: personalizes the new therapeutic listener prompt (from `chat_agent_prompts.py`)
  - When `ACCUMULATIVE_THERAPY_ENABLED=False`: personalizes the legacy `TWO_MODE_SYSTEM_PROMPT` (backward compatible)
- **Key paradigm difference:** Under the new system, pattern data is injected to help the chat agent **ask better questions** and **calibrate empathy**, NOT to generate per-message analysis. The prompt framing changes accordingly:
  - OLD: "대화에서 관련 주제가 나오면 패턴을 인식하고 있음을 보여주세요" (show pattern awareness)
  - NEW: "이 주제가 나오면 더 깊이 탐색하세요" (explore this topic more deeply when it comes up)
- **Sanitization (CC2):** The function uses ONLY category labels, counts, and pre-defined Korean descriptors — never raw user text. Pattern topics are category strings from a fixed set. Trigger phrases are replaced with category labels (e.g., "비난형 표현 3회" instead of quoting the actual phrase).
- **Prompt section example (Korean, for therapeutic listener):**
  ```
  ## 사용자 프로필

  이 사용자의 특성을 참고하여 공감과 탐색을 맞춤화하세요:

  - 애착 스타일: 불안형 (불안 4/5, 회피 2/5) - 안심시키는 표현을 많이 사용하세요
  - 갈등 스타일: 회피형 - 직접적 질문보다 부드럽게 탐색하세요
  - 소통 빈도 선호: 매일 - 자주 확인하는 것을 좋아하는 사용자입니다
  - 주요 목표: 소통 개선
  - 집중 영역: 의사소통, 감정표현

  ## 과거 패턴 참고 (최근 30일)

  이 정보는 더 나은 질문을 위한 참고입니다. 분석이나 해석을 제시하지 마세요:
  - 반복되는 갈등 주제: 재정 (5회), 가사분담 (3회) → 이 주제가 나오면 더 깊이 탐색하세요
  - 트리거 패턴: 비난형 표현 3회, 방어적 반응 2회 → 이런 패턴이 보이면 감정을 먼저 확인하세요
  - 에스컬레이션 추세: 개선 중 (평균 4.2/10)
  ```
- **Attachment style mapping:** anxiety >= 4 = "불안형 guidance", avoidance >= 4 = "회피형 guidance", both low = "안정형", both high = "혼란형"
- **communication_frequency mapping:** "daily" = "매일", "weekly" = "매주", "rarely" = "가끔" — influences guidance on questioning pace
- **Token budget:** < 700 tokens for the injected section (increased from 500 for Korean multi-byte characters). If context exceeds budget, truncate in priority order: (1) keep attachment + conflict style, (2) keep goals, (3) keep top 3 topics, (4) drop engagement details, (5) drop trend details.
- **Acceptance Criteria:**
  - Prompt includes user-specific profile data when available
  - Prompt gracefully handles missing data (no empty sections)
  - Prompt stays within 700 token budget for the injected section
  - Works with both new therapeutic listener prompt and legacy TWO_MODE_SYSTEM_PROMPT
  - Pattern data framed as "exploration guidance" not "analysis data" in new prompt
  - No raw user-generated text appears in system prompt (only categories/counts)

#### A3. Wire Into Chat Agent Pipeline
- **Modified files:**
  - When `ACCUMULATIVE_THERAPY_ENABLED=True`:
    - `backend/apps/chat/services/chat_agent/chat_graph.py` (from `accumulative-therapy-system.md` Task 1) — accepts `user_context` param
    - `backend/apps/chat/views.py` — calls `UserIntelligenceService` and passes context to chat agent
  - When `ACCUMULATIVE_THERAPY_ENABLED=False` (legacy fallback):
    - `backend/apps/chat/services/reframing_graph.py` — `run_reframing_pipeline()` accepts a `user_context` param
    - `backend/apps/chat/views.py` — `reframe_message()` calls `UserIntelligenceService` and passes context to pipeline
- **Changes:**
  1. In view: after getting `conversation_context`, call `UserIntelligenceService.get_ai_context(request.user.id)` (sync call, before entering async)
  2. Pass `user_context` dict to the active pipeline (new chat agent or legacy reframing)
  3. Pipeline uses `build_personalized_prompt(base_prompt, user_context)` to construct the system message
  4. If `user_context` is None or empty, fall back to unmodified base prompt
- **Acceptance Criteria:**
  - Chat agent for a user with attachment_anxiety=5 uses more reassuring language than for attachment_anxiety=1
  - Chat agent uses pattern knowledge to ask better exploratory questions (not to analyze)
  - Users without onboarding data still get valid responses (fallback to generic prompt)
  - No regression in response time (< 200ms added latency from context assembly)

#### A3b. Wire Into Comfort Mode
- **Modified files:**
  - When `ACCUMULATIVE_THERAPY_ENABLED=True`: The new chat agent handles comfort naturally via its phase-based conversation strategy (rapport phase = comfort-like). Comfort mode personalization is built into the therapeutic listener prompt.
  - When `ACCUMULATIVE_THERAPY_ENABLED=False` (legacy fallback):
    - `backend/apps/chat/services/reframing_graph.py` -- `run_comfort_pipeline()` accepts a `user_context` param
    - `backend/apps/chat/views.py` -- `comfort_message()` calls `UserIntelligenceService` and passes context
- **Key difference from A3:** Comfort mode personalization MUST include:
  - Attachment style and mood context (for empathy calibration)
  - Communication frequency preference
  - **MUST EXCLUDE:** Conflict patterns, trigger phrases, escalation data, recurring topics (comfort mode is non-analytical)
- **Implementation:** `build_personalized_prompt(base_prompt, user_context, mode="comfort")` — when `mode="comfort"`, strips pattern/escalation data from context before injection
- **Note:** Under the new paradigm, the distinction between "comfort" and "reframing" disappears. The therapeutic listener always prioritizes empathy and information gathering. The comfort-specific filtering is primarily for the legacy fallback.
- **Acceptance Criteria:**
  - Comfort responses acknowledge attachment style without analyzing patterns
  - No conflict data appears in comfort mode system prompt
  - Fallback to unmodified `COMFORT_MODE_PROMPT` when no context available

#### A4. Testing
- **New file:** `backend/apps/core/tests/test_user_intelligence.py`
- **Required tests:**
  - `test_complete_profile_context()` — user with all data returns full context dict
  - `test_partial_profile_context()` — user with only onboarding returns profile-only context
  - `test_no_profile_context()` — new user returns defaults
  - `test_high_risk_minimal_context()` — high-risk user gets no patterns/triggers
  - `test_moderate_risk_filtered_context()` — moderate-risk user gets partial context
  - `test_solo_user_no_couple()` — user without active couple returns individual context
  - `test_no_insight_summary()` — new user with no InsightSummary doesn't error
  - `test_cache_invalidation()` — context updates after profile change
  - `test_prompt_token_budget()` — personalized prompt stays under 700 tokens
  - `test_no_raw_user_text_in_system_prompt()` — verify sanitization
  - `test_comfort_mode_excludes_patterns()` — comfort/legacy mode has no conflict data
  - `test_therapeutic_listener_prompt_frames_patterns_as_guidance()` — new prompt uses exploration framing, not analysis framing
  - `test_feature_flag_dispatch()` — correct prompt target based on `ACCUMULATIVE_THERAPY_ENABLED`

---

## Workstream B: Mood-Pattern Correlation Engine (HIGH PRIORITY)
**Gap Addressed:** Gap 2 -- Check-in mood data is siloed
**Dependencies:** None (can start in parallel with A)
**Estimated Files Changed:** 5-6

### Objective
Correlate mood check-in data with conversation patterns to detect mood-conflict relationships and surface them to users and the AI.

> **Accumulative system integration:** MoodPatternService output is also consumed by `TherapyDataCollector._get_mood_trajectory()` (see `accumulative-therapy-system.md` Layer 2). The service built here serves dual purpose: real-time mood context for chat agent (via UserIntelligenceService) AND background mood data for analysis agents (via TherapyDataCollector).

### Data Flow
```
DailyCheckIn (mood 1-5, note, answers JSON, date)
  + Pattern (created_at, category, escalation_score)
  + InsightSummary (escalation_score, created_at)  [may not exist for new users]
  + CoolDown (started_at, completed_at)
  --> MoodPatternService.correlate(user_id, days=30)
  --> {mood_trend, conflict_days_vs_mood, pre_conflict_mood_avg, post_conflict_mood_avg}
```

### Detailed Tasks

#### B1. Create MoodPatternService
- **New file:** `backend/apps/checkins/services/mood_correlation.py`
- **What it does:**
  1. Loads last N days of `DailyCheckIn` for user (including `answers` JSON when present)
  2. Loads `InsightSummary` records for same period — **with `.exists()` guard**: if no records, skip correlation and return mood-only stats
  3. For each day with a conversation (matched via InsightSummary.created_at), compares that day's mood to average mood
  4. Calculates: mood_trend (7-day moving average direction), mood_on_conflict_days vs non-conflict_days, mood_after_cooldown
  5. Identifies "risk days" -- days where mood < 3 AND escalation_score > 5
  6. **DailyCheckIn.answers enhancement:** When `answers` JSON is present, extract additional sentiment signals (answer count, answer lengths as engagement proxy). Full NLP analysis deferred to Workstream F.
- **Solo handling (CC3):** Works purely on individual data; no couple dependency.
- **Output format:**
  ```python
  {
    "mood_trend": "declining",  # improving/stable/declining
    "avg_mood_7d": 3.2,
    "avg_mood_30d": 3.8,
    "conflict_day_mood_avg": 2.4,      # null if no InsightSummary records
    "non_conflict_day_mood_avg": 3.9,   # null if no InsightSummary records
    "mood_after_cooldown_avg": 3.1,     # null if no cooldown records
    "risk_days_count": 3,
    "has_detailed_answers": True,        # whether any check-in had answers JSON
    "correlation_insight": "갈등이 있는 날의 기분이 평소보다 1.5점 낮습니다"  # null if insufficient data
  }
  ```
- **Acceptance Criteria:**
  - Returns valid stats even with sparse data (< 7 check-ins)
  - Handles users with no check-ins gracefully (returns None/defaults)
  - Handles users with no InsightSummary records (returns mood-only data, correlation fields null)
  - Computation completes in < 100ms for 90 days of data

#### B2. Inject Mood Context Into AI (depends on A1 existing)
- **Modified file:** `backend/apps/core/services/user_intelligence.py` (created in A1)
- **What it does:** Add mood correlation data to the context snapshot
- **Sanitization (CC2):** Today's check-in note/answers are NOT injected into system prompt. Only aggregated mood numbers and trend labels.
- **Prompt section added (to reframing mode only, NOT comfort mode):**
  ```
  ## 최근 기분 상태
  - 최근 7일 평균 기분: 3.2/5 (하락 추세)
  - 갈등이 있는 날 평균 기분: 2.4/5
  - 오늘 체크인 기분: 2/5
  ```
- **Acceptance Criteria:**
  - AI acknowledges mood context when relevant
  - No raw check-in notes appear in system prompt (only mood scores and trends)

#### B3. Mood-Pattern Correlation API Endpoint
- **Modified file:** `backend/apps/checkins/urls.py` and new view function
- **New endpoint:** `GET /api/v1/checkins/mood-insights/`
- **Returns:** Output of MoodPatternService for the authenticated user
- **Acceptance Criteria:**
  - Returns 200 with correlation data
  - Returns 200 with empty/default data for users without check-ins or without InsightSummary

#### B4. Testing (NEW)
- **New file:** `backend/apps/checkins/tests/test_mood_correlation.py`
- **Required tests:**
  - `test_full_data_correlation()` — user with check-ins and insights
  - `test_mood_only_no_insights()` — user with check-ins but no InsightSummary
  - `test_no_checkins()` — returns defaults
  - `test_sparse_data()` — fewer than 7 check-ins
  - `test_risk_day_detection()` — mood < 3 + escalation > 5
  - `test_answers_field_included()` — check-ins with answers JSON are handled

---

## Workstream C: Relationship Health Score (HIGH PRIORITY)
**Gap Addressed:** Gap 5 -- No composite metric despite having all component data
**Dependencies:** B1 (MoodPatternService) should exist but can use stubs; A1 (UserIntelligenceService) for pattern data
**Estimated Files Changed:** 5-6

### Objective
Create a composite relationship health score (0-100) that synthesizes mood, patterns, engagement, and activity data into a single actionable metric.

> **Accumulative system integration:** Health score components can serve as threshold signals for `AnalysisTriggerService._check_threshold_breach()` (see `accumulative-therapy-system.md` Layer 3). A sharp health score decline could trigger analysis. The health score API is also a natural companion to InsightReport delivery — showing "your score improved since our last analysis."

### Data Flow
```
DailyCheckIn.mood (weight: 25%)
  + escalation_trend from WeeklySummary (weight: 25%)
  + Streak.current_streak + CoupleActivity completion rate (weight: 20%)
  + Pattern severity trend (weight: 15%)
  + CoolDown frequency trend (weight: 15%)
  --> HealthScoreService.compute(user_id, couple_id=None)
  --> { score: 72, components: {...}, trend: "improving", insights: [...] }
```

### Detailed Tasks

#### C1. Create HealthScoreService
- **New file:** `backend/apps/patterns/services/health_score.py`
- **Components computed:**
  1. **Mood Component (0-25):** Average mood over last 14 days, scaled. mood_avg * 5 = raw, capped at 25
  2. **Escalation Component (0-25):** Inverse of average escalation. (10 - avg_escalation) * 2.5
  3. **Engagement Component (0-20):** current_streak (capped at 7 for scoring = 10pts, documented as tuning parameter) + activity_completion_rate_30d (0-1 * 10pts). Note: `CoupleActivity.rating` has no bounds validation — use `max(0, min(5, rating))` defensive clamp.
  4. **Pattern Severity Component (0-15):** Inverse of avg pattern severity last 30 days. (5 - avg_severity) * 3
  5. **Cooldown Component (0-15):** Inverse of cooldown frequency trend. Fewer cooldowns = higher score. Compare this week vs last week
- **Solo user handling (CC3):** When `couple_id` is None or couple is pending, compute individual score only. Skip "Both partners' data averaged" step. Cap individual score at individual component maxes.
- **Couple-level score:** Both partners' individual scores averaged — only when couple is active and both partners have data.
- **Missing data:** Components with no data get neutral score: 50% of their max (documented as design choice, not a bug).
- **Trend:** Compare current score to 7-day-ago score
- **Tuning parameters:** Document all magic numbers (streak cap=7, weights, grade thresholds) as constants at top of file for easy adjustment.
- **Output:**
  ```python
  {
    "score": 72,
    "grade": "양호",  # 0-30: 위험, 31-50: 주의, 51-70: 보통, 71-85: 양호, 86-100: 매우 좋음
    "trend": "improving",
    "is_couple_score": True,  # False for solo users
    "components": {
      "mood": {"score": 18, "max": 25, "detail": "평균 기분 3.6/5"},
      "escalation": {"score": 20, "max": 25, "detail": "평균 에스컬레이션 2.0/10"},
      "engagement": {"score": 14, "max": 20, "detail": "5일 연속 체크인, 활동 완료율 60%"},
      "patterns": {"score": 12, "max": 15, "detail": "패턴 심각도 평균 2.0/5"},
      "cooldown": {"score": 8, "max": 15, "detail": "이번 주 쿨다운 2회 (지난주 4회)"}
    },
    "insights": [
      "에스컬레이션 점수가 지난주보다 개선되었어요",
      "재정 관련 갈등이 3주 연속 나타나고 있어요"
    ]
  }
  ```
- **Acceptance Criteria:**
  - Score is 0-100, components sum to 100 max
  - Handles missing data gracefully (components with no data get neutral score)
  - Both individual and couple-level scores supported
  - Solo users receive individual-only score without errors
  - Insights are generated in Korean, max 3 items
  - CoupleActivity.rating defensively clamped

#### C2. Health Score API Endpoint
- **New files:** Add to `backend/apps/patterns/urls.py` and `backend/apps/patterns/views.py`
- **Endpoints:**
  - `GET /api/v1/patterns/health-score/` -- current user's health score
  - `GET /api/v1/patterns/health-score/history/` -- last 30 days of daily scores
- **Acceptance Criteria:**
  - Returns current score with all components
  - History endpoint returns array of {date, score, grade} objects

#### C3. Store Daily Health Scores (Celery task)
- **New model:** `DailyHealthScore` in patterns app
  - Fields: user, couple (nullable for solo users), date, score, components (JSON), created_at
- **New Celery task:** `compute_daily_health_scores` -- runs daily at midnight KST
  - Iterates active couples + solo users with recent activity, computes score for each user, stores
- **Scheduling:** The existing weekly summary task uses `app.conf.beat_schedule` in `config/celery.py`. Follow the same pattern: add the daily health score task to `beat_schedule` in `config/celery.py`. Alternatively, use `django_celery_beat`'s `PeriodicTask` table via data migration for database-driven scheduling. Either approach works — match the existing project convention.
  - Also add a management command `python manage.py compute_health_scores` for manual testing (since `CELERY_TASK_ALWAYS_EAGER=True` in dev)
- **Migration:** Single migration file that creates `DailyHealthScore` model + registers the periodic task via `django_celery_beat`
- **Acceptance Criteria:**
  - Task runs daily and stores scores for all active couples + solo active users
  - Historical scores are queryable for trend charts
  - Management command exists for manual dev testing

#### C4. Testing (NEW)
- **New file:** `backend/apps/patterns/tests/test_health_score.py`
- **Required tests:**
  - `test_full_couple_score()` — active couple, both partners with data
  - `test_solo_user_score()` — user without active couple
  - `test_missing_component_neutral()` — components with no data get 50% neutral
  - `test_score_bounds()` — score always 0-100
  - `test_rating_clamp()` — CoupleActivity.rating out of bounds handled
  - `test_daily_task_stores_scores()` — celery task integration test

---

## Workstream D: Proactive Recommendation Engine (MEDIUM PRIORITY)
**Gap Addressed:** Gap 6 -- No proactive recommendations
**Dependencies:** A1 (UserIntelligenceService), C1 (HealthScoreService) -- can start after A & C foundations exist
**Estimated Files Changed:** 5-7

### Objective
Recommend activities, prompts, and actions based on detected patterns, mood trends, and health score components.

> **Relationship to Resolution Strategist:** The accumulative system's Resolution Strategist agent (see `accumulative-therapy-system.md` Layer 4, Agent 4) generates deep, personalized suggestions from multi-session analysis. This Recommendation Engine operates at a lighter, more frequent level — suggesting existing app activities and prompts based on health score components. The two complement each other:
> - **RecommendationService** (this workstream): rule-based, runs on every dashboard load, maps health score weaknesses to existing app content (activities, prompts)
> - **Resolution Strategist** (accumulative system): LLM-powered, runs only when analysis triggers fire, generates novel therapeutic suggestions from accumulated context
>
> When InsightReport includes `recommended_activities`, those take priority over RecommendationService output to avoid conflicting suggestions.

### Data Flow
```
HealthScoreService.compute() -- identifies weak components
  + Pattern (recent categories)
  + DailyCheckIn (mood trend)
  + CoupleActivity (completed activities to avoid repeats)
  + DailyPrompt (available prompts matching needed categories)
  + UserProfile.communication_frequency  --> gates recommendation frequency
  --> RecommendationService.get_recommendations(user_id, couple_id)
  --> [ {type: "activity", item: {...}, reason: "..."}, {type: "prompt", ...} ]
```

### Detailed Tasks

#### D1. Create RecommendationService
- **New file:** `backend/apps/activities/services/recommendations.py`
- **Logic:**
  1. Get health score components from C1
  2. **Check for active InsightReport recommendations:** Query `InsightReport` for user where `status='ready'` and `recommended_activities` is non-empty. If found, these take priority (see `accumulative-therapy-system.md` Layer 5).
  3. Identify weakest components (below 50% of max)
  4. Map weakness to recommendation type:
     - Low mood score --> suggest "gratitude" category prompts, "date" category activities
     - High escalation --> suggest "conversation" activities with lower difficulty, cooldown reminders
     - Low engagement --> suggest easy/short activities, streak motivation
     - Recurring topic (e.g., finance) --> suggest finance-related prompts from DailyPrompt
  5. **Merge with InsightReport:** If step 2 found InsightReport recommendations, place them first. Deduplicate: if this service and InsightReport both recommend the same activity, keep the InsightReport version (it has richer, LLM-generated reasoning). Cap total recommendations at communication_frequency limit.
  6. Filter out already-completed activities (last 14 days)
  7. **communication_frequency gating:** User with "rarely" preference gets max 2 light recommendations; "daily" gets up to 5; "weekly" gets 3.
  8. Rank by relevance, return top N (based on communication_frequency)
- **Solo handling (CC3):** Skip couple-specific activity recommendations. Only suggest individual activities and prompts.
- **Output:**
  ```python
  [
    {
      "type": "activity",
      "item_id": 5,
      "title": "감사 일기 함께 쓰기",
      "reason": "최근 기분이 낮은 추세예요. 감사 표현이 기분 개선에 도움될 수 있어요.",
      "priority": "high",
      "source": "health_score"       # "health_score" | "insight_report"
    },
    {
      "type": "prompt",
      "item_id": 12,
      "title": "돈에 대해 서로 어떤 가치관을 가지고 있나요?",
      "reason": "재정이 반복 갈등 주제입니다. 평화로운 시간에 대화해보세요.",
      "priority": "medium",
      "source": "health_score"
    }
  ]
  ```
- **Acceptance Criteria:**
  - Returns recommendations with reasons in Korean
  - Recommendation count respects communication_frequency preference
  - No duplicate recommendations within 7 days
  - Handles couples with no activity history (recommends featured/easy items)
  - Reasons reference specific data points (not generic "try this")

#### D2. Recommendation API Endpoint
- **Modified file:** `backend/apps/activities/urls.py` and views
- **Endpoint:** `GET /api/v1/activities/recommendations/`
- **Acceptance Criteria:**
  - Returns personalized recommendations with reasons
  - Responses cached for 6 hours per user (invalidated on check-in/activity completion)

#### D3. Smart Daily Prompt Selection
- **Modified file:** `backend/apps/prompts/` -- add service logic for context-aware prompt assignment
- **Current state:** Prompts are assigned randomly (today_prompt view)
- **New logic:** When assigning daily prompt, consider:
  1. Recurring conflict topics --> pick prompts in matching categories
  2. Mood trend --> if declining, pick lighter/gratitude prompts; if stable, pick deeper prompts
  3. communication_frequency --> "rarely" users get gentler prompts
  4. Never repeat a prompt within 30 days
- **Acceptance Criteria:**
  - Daily prompt assignment considers pattern and mood data
  - Prompt category selection is explainable (logged with reason)

#### D4. Testing (NEW)
- **New file:** `backend/apps/activities/tests/test_recommendations.py`
- **Required tests:**
  - `test_low_mood_recommends_gratitude()` — maps weakness to correct type
  - `test_communication_frequency_limits()` — "rarely" user gets max 2
  - `test_no_duplicate_recommendations()` — 7-day dedup
  - `test_solo_user_recommendations()` — individual-only activities
  - `test_insight_report_priority()` — InsightReport recommendations appear first and override duplicates
  - `test_insight_report_dedup()` — same activity from both sources appears once with InsightReport reasoning

---

## Workstream E: Cooldown Analytics & Partner Dashboard (MEDIUM PRIORITY)
**Gap Addressed:** Gaps 7 & 8 -- Cooldown frequency not analyzed; partner-level insights missing
**Dependencies:** None (can run in parallel)
**Estimated Files Changed:** 5-7

### Objective
Track cooldown usage as an escalation signal and provide couple-level comparative analytics.

> **Accumulative system integration:** Cooldown analytics data is consumed by `TherapyDataCollector` as part of the comprehensive context. The partner dashboard provides the user-facing view; the analysis agents use the same underlying data for cross-source pattern detection.

### Detailed Tasks

#### E1. Cooldown Analytics Service
- **New file:** `backend/apps/cooldown/services/analytics.py`
- **What it does:**
  1. Query `CoolDown` records for user/couple over last 30 days
  2. Compute: frequency_this_week, frequency_last_week, trend, avg_duration, completion_rate (completed_at not null / total)
  3. Correlate with conversation escalation scores on same days
  4. Identify "cooldown clusters" -- multiple cooldowns in 24h = high stress day
- **Output:**
  ```python
  {
    "total_30d": 8,
    "this_week": 2,
    "last_week": 4,
    "trend": "improving",
    "avg_duration_seconds": 480,
    "completion_rate": 0.75,
    "high_stress_days": ["2026-02-05", "2026-02-01"],
    "correlation_with_escalation": 0.72
  }
  ```
- **Acceptance Criteria:**
  - Returns valid analytics even with < 3 cooldown records
  - High stress days correctly identified (2+ cooldowns in 24h)

#### E2. Partner Comparison Dashboard API
- **New file:** `backend/apps/couples/services/partner_dashboard.py`
- **New endpoints in `backend/apps/couples/urls.py`:**
  - `GET /api/v1/couples/dashboard/` -- couple-level analytics
- **Privacy enforcement (CC2 + Architect #7):** All partner data queries use **queryset-level filtering**:
  - Each partner's `Pattern` query filters by `user=requesting_user` — partner patterns are NEVER loaded
  - Partner section shows only: display_name, mood_avg, checkin_streak, conversation_count (aggregate numbers only)
  - Pattern content is NEVER shown for the other partner, only category counts
  - If `couple_features_enabled == False` (CC1): return 403 with message
- **What it returns:**
  ```python
  {
    "couple_health_score": 72,
    "my_stats": {
      "display_name": "...",
      "mood_avg_7d": 3.5,
      "checkin_streak": 5,
      "conversation_count_30d": 8,
      "top_patterns": [...]  # own patterns only
    },
    "partner_stats": {
      "display_name": "...",
      "mood_avg_7d": 4.0,
      "checkin_streak": 3,
      "conversation_count_30d": 5
      # NO pattern content for partner
    },
    "shared_metrics": {
      "activities_completed_together": 3,
      "prompts_both_answered": 7,
      "cooldowns_total": 6,
      "escalation_trend": "improving"
    }
  }
  ```
- **Solo handling (CC3):** If no active couple, return individual-only dashboard (no partner_stats, no shared_metrics).
- **Acceptance Criteria:**
  - Both partners see the same couple-level metrics
  - Individual pattern content is not leaked to the other partner (queryset-level isolation)
  - Solo users get individual-only dashboard
  - `couple_features_enabled == False` returns 403

#### E3. Testing (NEW)
- **New file:** `backend/apps/couples/tests/test_partner_dashboard.py`
- **Required tests:**
  - `test_partner_data_isolation()` — partner A cannot see partner B's pattern content
  - `test_couple_features_disabled()` — returns 403 when safety disables couple features
  - `test_solo_user_dashboard()` — returns individual-only data
  - `test_shared_metrics_symmetric()` — both partners see same shared metrics

---

## Workstream F: Activity & Prompt Intelligence Feedback Loop (LOWER PRIORITY)
**Gap Addressed:** Gap 4 -- Activity/prompt data unused for intelligence
**Dependencies:** C1 (HealthScoreService) for score impact measurement
**Estimated Files Changed:** 4-5

### Objective
Use activity completion ratings and prompt response data to measure effectiveness and feed back into the health score and AI context.

> **Accumulative system integration:** Activity effectiveness data feeds into both `TherapyDataCollector._get_activity_engagement()` for background analysis and the Resolution Strategist's `activity_recommendations` output. Prompt alignment scores can serve as data points for the Pattern Analyst agent.

### Detailed Tasks

#### F1. Activity Effectiveness Tracking
- **Modified file:** `backend/apps/activities/` -- add service
- **What it does:**
  1. After activity completion + rating, check if mood improved in next check-in
  2. Track per-activity-type effectiveness: {activity_category: avg_rating, mood_impact}
  3. Feed effective activity types into recommendation engine (D1)
- **DailyCheckIn.answers enhancement:** If `answers` JSON is present in post-activity check-ins, use answer length/count as additional engagement signal.
- **Acceptance Criteria:**
  - Activity effectiveness is measurable per category
  - High-rated activities are prioritized in recommendations

#### F2. Prompt Response Analysis
- **New file:** `backend/apps/prompts/services/analysis.py`
- **What it does:**
  1. When both partners respond to a daily prompt, run lightweight sentiment comparison
  2. Identify prompts where responses diverge significantly (potential tension point) vs align (positive indicator)
  3. Store alignment score per prompt assignment
- **Acceptance Criteria:**
  - Alignment score computed when both partners have responded
  - Results available in couple dashboard (E2)

#### F3. Testing (NEW)
- **Required tests:**
  - `test_activity_effectiveness_tracking()` — mood impact measured post-activity
  - `test_prompt_alignment_both_responded()` — alignment computed
  - `test_prompt_alignment_one_responded()` — graceful handling

---

## Infrastructure Tasks (NEW — required before or alongside Workstream A)

### I1. Add Django Cache Configuration (BLOCKING for A1)
- **Modified file:** `backend/config/settings/base.py`
- **Add:**
  ```python
  CACHES = {
      'default': {
          'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
          'LOCATION': 'unique-snowflake',
      }
  }
  ```
- **Production override** in `production.py` should use Redis (same instance as channels/celery):
  ```python
  CACHES = {
      'default': {
          'BACKEND': 'django.core.cache.backends.redis.RedisCache',
          'LOCATION': env('REDIS_URL', default='redis://localhost:6379/2'),
      }
  }
  ```
- **Cache invalidation strategy:** Django signals on model save/delete for: `UserProfile`, `UserGoals`, `SafetyAssessment`, `Pattern`, `DailyCheckIn`, `Streak`. Signal handler calls `cache.delete(f'user_intelligence:{user.id}')`.

### I2. Database Index Migration (CC6)
- **New migration file** (single migration across relevant apps using `RunSQL`):
  - `Pattern(user, pattern_type, created_at)` compound index
  - `InsightSummary(user, created_at)` compound index
  - `CoolDown(user, created_at)` index if not present

---

## Implementation Priority & Parallelization

```
Week 0 (Prerequisites):
  [I1] Django Cache Configuration  <-- BLOCKING for A1
  [I2] Database Index Migration     <-- can be parallel

Week 1-2 (Parallel — aligns with accumulative-therapy-system.md Phase 1-2):
  [Workstream A] Personalized AI Context    <-- highest value; A2/A3 depend on accumulative Task 1 (Chat Agent)
  [Workstream B] Mood-Pattern Correlation   <-- independent, high value
  [Workstream E] Cooldown + Partner Dashboard <-- independent
  NOTE: A2 (prompt builder) MUST wait for accumulative Task 1 to create chat_agent_prompts.py

Week 2-3 (Parallel after A+B foundations — aligns with accumulative Phase 2-3):
  [Workstream C] Health Score               <-- depends on B1, A1
  [Workstream D] Recommendations            <-- depends on A1, C1; integrates with accumulative Task 4 (InsightReport)

Week 3-4 (aligns with accumulative Phase 3-4):
  [Workstream F] Activity/Prompt Feedback   <-- depends on C1, D1
```

### Dependency Graph
```
I1 (cache config) -----> A1 (UserIntelligenceService)
                          |
                          +--> A2 (prompt builder) --> A3 (reframing wiring)
                          |                        --> A3b (comfort wiring)
                          +--> B2 (mood in AI context)
                          +--> C1 (health score)
                          +--> D1 (recommendations)

(independent) B1 (mood correlation) --> B2, B3
(independent) E1 (cooldown analytics) --> E2 (dashboard)
(independent) I2 (indexes)

C1 --> C2, C3
C1, A1 --> D1 --> D2, D3
C1 --> F1, F2
```

### Files Impact Summary

| File | Workstreams | Change Type |
|------|-------------|-------------|
| `config/settings/base.py` | I1 | MODIFY (add CACHES) |
| `config/settings/production.py` | I1 | MODIFY (Redis cache) |
| `core/services/user_intelligence.py` | A, B | NEW |
| `core/tests/test_user_intelligence.py` | A | NEW |
| `chat/prompts/system_prompts.py` | A | MODIFY (add builder functions, legacy fallback) |
| `chat/prompts/chat_agent_prompts.py` | A | MODIFY (personalization for therapeutic listener — file from accumulative-therapy-system.md) |
| `chat/services/chat_agent/chat_graph.py` | A | MODIFY (accept user_context — file from accumulative-therapy-system.md) |
| `chat/services/reframing_graph.py` | A | MODIFY (accept user_context, legacy fallback) |
| `chat/views.py` | A | MODIFY (pass user_context to active pipeline) |
| `checkins/services/mood_correlation.py` | B | NEW |
| `checkins/tests/test_mood_correlation.py` | B | NEW |
| `checkins/urls.py` + views | B | MODIFY |
| `patterns/services/health_score.py` | C | NEW |
| `patterns/tests/test_health_score.py` | C | NEW |
| `patterns/models.py` | C | MODIFY (add DailyHealthScore) |
| `patterns/tasks.py` | C | MODIFY (add daily task) |
| `patterns/urls.py` + views | C | MODIFY |
| `activities/services/recommendations.py` | D | NEW |
| `activities/tests/test_recommendations.py` | D | NEW |
| `activities/urls.py` + views | D | MODIFY |
| `prompts/services/` | D, F | NEW |
| `cooldown/services/analytics.py` | E | NEW |
| `cooldown/urls.py` + views | E | MODIFY |
| `couples/services/partner_dashboard.py` | E | NEW |
| `couples/tests/test_partner_dashboard.py` | E | NEW |
| `couples/urls.py` | E | MODIFY |
| Migration files | I2, C | NEW (2-3 migrations) |

## Guardrails

### Must Have
- **Safety gate (CC1):** High-risk users receive minimal/no personalization. `couple_features_enabled` is respected.
- **Prompt injection protection (CC2):** No raw user text in system prompts. Sanitization function applied to all user-derived content.
- **Solo user support (CC3):** All services handle `couple=None` / `pending` status.
- **Sync/async boundary (CC4):** UserIntelligenceService called synchronously in views, before entering async pipeline.
- **Encrypted field safety (CC5):** No decrypted `ai_summary` or `trend_text` in cache.
- All new services have graceful degradation when data is missing
- No breaking changes to existing API contracts
- All prompts stay within token budget (new sections < 700 tokens)
- Partner data privacy preserved (queryset-level filtering, no pattern content cross-partner)
- Korean language throughout all user-facing text
- All new endpoints require authentication
- Testing per workstream with safety-critical paths covered

### Must NOT Have
- No database schema changes to existing models (only additions)
- No changes to the safety/crisis detection pipeline
- No removal or restructuring of existing prompt text
- No frontend/mobile changes in this plan (backend only)
- No changes to LLM provider configuration
- No hardcoded user data in prompts (all dynamic from DB)
- No new scheduling mechanism — follow existing `beat_schedule` pattern in `config/celery.py`
- **No per-message analysis injection** — pattern data in chat agent prompts is for empathy calibration and better questioning, NOT for generating per-message analysis (that is the analysis agents' job in the accumulative system)
- **No duplication of TherapyDataCollector** — UserIntelligenceService (this plan) is lightweight/cached/real-time; TherapyDataCollector (accumulative plan) is comprehensive/background. Do not merge or duplicate their responsibilities.

## Success Criteria

1. **Personalization test:** Two users with different profiles (high-anxiety vs low-anxiety) receive measurably different chat agent responses to the same conflict message — different empathy tone, different questioning approach
2. **Safety test:** A high-risk user receives ZERO trigger phrases or escalation data in their AI context
3. **Pattern-guided exploration test:** A user who has discussed "money" 5 times gets a chat agent that gently explores financial topics when relevant (by category, not by quoting their words) — NOT analyzing the pattern, but asking better questions
4. **Health score test:** Score correctly reflects a couple's engagement level -- active couple with good moods scores > 70, disengaged couple with high escalation scores < 40. Solo user gets valid individual score.
5. **Recommendation relevance test:** Recommendations cite specific data points as reasons and respect communication_frequency preference. InsightReport recommendations take priority when both exist.
6. **Dashboard test:** Both partners see consistent couple-level metrics while individual pattern data remains private (queryset-level verification)
7. **Feature flag test:** `ACCUMULATIVE_THERAPY_ENABLED=True` targets new therapeutic listener prompt; `False` targets legacy TWO_MODE_SYSTEM_PROMPT. Both paths produce valid personalized output.
8. **Test suite:** All new services have unit tests covering happy path, edge cases, safety gates, and solo-user scenarios
9. **Service boundary test:** UserIntelligenceService completes in < 200ms (cached). TherapyDataCollector (separate service, separate plan) is not called in real-time chat path.
