# Accumulative Therapy System: Multi-Agent Architecture with Session-Based Intelligence
# CouplesAI: LangGraph Multi-Agent System with Longitudinal Data Accumulation

> **Status:** DRAFT v1
> **Replaces:** `multi-agent-therapy-pipeline.md` (per-message analysis paradigm)
> **Paradigm Shift:** From "analyze each message instantly" to "accumulate data across sessions, deliver insights when ready"
> **LangGraph Pattern:** `StateGraph` with conditional edges + background analysis triggers
> **Inspiration:** Real couples therapy — therapists listen across multiple sessions before offering analysis

---

## Context

### Current Architecture (Single-Call, Per-Message)
```
user_message
  + conversation_context (rolling summary + recent messages)
  --> check_safety() keyword pre-filter (0 LLM calls)
  --> TWO_MODE_SYSTEM_PROMPT (static Korean prompt)
  --> 1 LLM call (model decides chat vs reframing mode)
  --> JSON response parsed, returned to client
```

**Core Problem:** The current system tries to be a therapist in a single message — analyzing patterns, providing balanced perspectives, suggesting solutions, all at once. This is like a therapist diagnosing and prescribing in the first 5 minutes of the first session.

### Why Per-Message Analysis Is Wrong

Real couples therapy works differently:

| Real Therapy | Current System |
|---|---|
| Sessions 1-2: Listen, empathize, gather information | Message 1: Full analysis + suggestions |
| Sessions 3-5: Observe patterns internally | Every message: Pattern analysis |
| Right moment: Share insights | Every message: Share everything immediately |
| Over weeks: Build understanding | Per message: No memory of trajectory |

The current system conflates **data collection** with **analysis delivery**. A therapist doesn't tell you your attachment pattern in the first session — they listen, observe, accumulate, and share when the time is right.

### Target Architecture (Accumulative Therapy System)
```
[DATA COLLECTION LAYER - Every interaction]
  Chat messages ──────────────┐
  Daily check-ins (mood/notes)─┤
  Audio recordings (transcript)─┼──> Therapy Intelligence Store
  Activity completion/ratings ──┤
  Pattern detection (async) ───┘

[ANALYSIS TRIGGER LAYER - System evaluates periodically]
  Trigger Service checks:
    - Data sufficiency (enough conversations, patterns)
    - Time-based (weekly cycle)
    - Threshold breach (escalation, mood decline)
    - Milestone events (first full conflict described)
  --> If triggered: dispatch multi-agent analysis

[ANALYSIS LAYER - Runs on accumulated data, not single messages]
  Pattern Analyst ────────┐
  Emotion Interpreter ────┼──> Cross-source analysis on ALL accumulated data
  Balance Mediator ───────┤
  Resolution Strategist ──┘
  Ethics Guardian ────────── Always validates output

[DELIVERY LAYER - Two channels]
  In-conversation: AI naturally weaves insights into next chat
  Separate report: Weekly summary / milestone report in app
```

**Token Budget:** Chat interactions use 1-2 LLM calls (same as current). Multi-agent analysis runs only when triggered (background, async), not on every message.

---

## Work Objectives

1. Transform the chat agent from "analyzer" to "therapeutic listener" — its job is empathy, information gathering, and calming
2. Build a Therapy Intelligence Store that aggregates data from all app sources (chat, check-ins, audio, activities, patterns)
3. Implement a trigger system that determines when accumulated data is sufficient for analysis
4. Create 5 specialized analysis agents that operate on accumulated data, not single messages
5. Deliver insights through two channels: naturally in conversation + separate reports
6. Maintain backward compatibility with existing API contracts during transition

---

## Guardrails

### Must Have
- Feature flag (`ACCUMULATIVE_THERAPY_ENABLED`) for gradual rollout
- Chat agent produces Korean-language output using consistent honorific style (~입니다, ~세요)
- Ethics Guardian runs on EVERY analysis output (cannot be skipped)
- Existing `check_safety()` keyword pre-filter and `detect_crisis()` remain unchanged
- Chat agent tracks an **information checklist** — what it knows, what it needs to learn
- Analysis triggers are configurable (thresholds, timing, data requirements)
- Insights are never forced — the system asks permission before sharing deep analysis in conversation
- Solo user handling: system works without partner context (graceful degradation)
- All analysis data is encrypted at rest (extend existing `EncryptedTextField` pattern)

### Must NOT Have
- No per-message multi-agent analysis (the fundamental paradigm change)
- No changes to existing Django models in Phase 1 (new models added alongside)
- No changes to WebSocket consumer (`consumers.py`)
- No new LLM provider integrations (use existing `_PROVIDER_FACTORIES`)
- No removal of existing prompts (kept as fallback when feature flag is off)
- No new API endpoints that break mobile app — new endpoints are additive
- No unsolicited deep analysis — chat agent asks "Would you like me to share what I've noticed?" before delivering insights

---

## Architecture Design

### Layer 1: Chat Agent (Therapeutic Listener)

The chat agent is the primary user-facing component. Its role fundamentally changes from "analyst who responds" to "therapist who listens."

#### Information Checklist

The chat agent maintains a per-conversation checklist of what it has gathered. This guides its questioning strategy.

```python
# File: backend/apps/chat/services/chat_agent/information_state.py

class ConflictInformation(TypedDict, total=False):
    """Tracks what the chat agent has learned about a conflict."""

    # Core conflict elements
    event_described: bool           # Is there a specific conflict event?
    user_emotion_expressed: bool    # Has the user expressed their emotions?
    partner_behavior_described: bool # Has partner's behavior/reaction been described?
    trigger_identified: bool        # Is the conflict trigger identified?
    context_provided: bool          # Enough context (when, where, history)?
    desired_outcome_expressed: bool # What does the user want to happen?

    # Extracted data (populated as conversation progresses)
    conflict_topic: str | None      # e.g., "finance", "parenting", "communication"
    user_emotions: list[str]        # e.g., ["분노", "서운함"]
    partner_emotions: list[str]     # Inferred from user's description
    key_quotes: list[str]           # Direct quotes from user about the conflict
    escalation_level: str           # "low" | "moderate" | "high"


class ChatAgentState(TypedDict, total=False):
    """State managed by the chat agent across a conversation session."""

    # Conversation tracking
    message_count: int
    conflict_info: ConflictInformation
    conversation_phase: str         # "rapport" | "exploration" | "deepening" | "reflection"

    # User profile context (from UserIntelligenceService — see backend-intelligence-upgrade.md A1)
    communication_frequency: str    # "daily" | "weekly" | "rarely" — gates questioning pace
    attachment_style_label: str     # "불안형" | "회피형" | "안정형" | "혼란형" — calibrates empathy tone

    # What the agent should do next
    gathering_strategy: str         # "open_question" | "clarifying" | "empathy" | "reflection"
    missing_information: list[str]  # What checklist items are still unchecked

    # Emotional state tracking (per-message)
    current_emotional_intensity: int  # 1-10
    mood_trajectory: str            # "stable" | "improving" | "declining"
```

#### Chat Agent Behavior by Phase

```
Phase 1: Rapport Building (messages 1-3)
  - Primary empathy and validation
  - Light exploration: "What's been on your mind?"
  - NO probing questions yet
  - Strategy: open_question, empathy

Phase 2: Exploration (messages 4-8)
  - Begin gentle information gathering
  - "Can you tell me more about what happened?"
  - "How did that make you feel?"
  - Track checklist progress
  - Strategy: clarifying, open_question

Phase 3: Deepening (messages 9+)
  - Targeted questions for missing checklist items
  - "You mentioned X — how did your partner react?"
  - "Has this kind of situation come up before?"
  - Strategy: clarifying, reflection

Phase 4: Reflection (when checklist substantially complete)
  - Summarize what the agent has learned
  - "Let me make sure I understand the situation correctly..."
  - Signal readiness: this feeds into analysis trigger
  - Strategy: reflection, empathy

Phase Pacing by communication_frequency (see backend-intelligence-upgrade.md A1):
  - "daily": Standard pacing — move through phases naturally
  - "weekly": Slower pacing — spend more time in rapport, ask fewer questions per message
  - "rarely": Minimal pacing — prioritize empathy, limit to 1 gentle question per message
```

#### Chat Agent System Prompt (Korean)

```
당신은 따뜻하고 전문적인 커플 관계 상담사입니다.

## 핵심 역할
사용자의 이야기를 경청하고, 공감하며, 자연스럽게 정보를 이끌어냅니다.
분석이나 해결책을 제시하지 않습니다. 당신의 역할은 듣고 이해하는 것입니다.

## 대화 단계별 지침

### 초기 (대화 시작)
- 따뜻한 인사와 공감으로 시작
- "오늘 어떤 이야기를 나눠볼까요?" 같은 개방형 질문
- 사용자가 편안함을 느끼도록 하는 것이 목표

### 탐색 (정보 수집)
- 구체적 상황을 부드럽게 탐색
- "그때 어떤 기분이 드셨어요?"
- "상대방은 어떤 반응이었나요?"
- 절대 캐묻지 말고, 자연스러운 대화 흐름 유지

### 심화 (부족한 정보 수집)
- 아직 파악하지 못한 부분을 자연스럽게 질문
- "이런 상황이 이전에도 있었나요?"
- "가장 바라시는 것은 무엇인가요?"

### 정리 (충분한 정보 수집 후)
- 지금까지 이해한 것을 요약
- "제가 이해한 바로는..." 으로 시작
- 사용자의 확인을 구함

## 현재 수집된 정보
{information_checklist_status}

## 수집이 필요한 정보
{missing_information}

## 규칙
- 분석, 패턴 해석, 해결책 제시 금지 (이것은 별도 분석 시스템의 역할)
- 누가 맞고 틀린지 판단 금지
- 사용자가 "분석해줘" 또는 "어떻게 해야 해?" 라고 하면:
  "조금 더 이야기를 나눠본 후에 정리해드릴게요" 로 자연스럽게 전환
- 한국어 격식체 사용
- 공감 우선, 질문은 부드럽게

## 출력 형식
{"message": "자연스러운 한국어 대화 응답", "checklist_update": {...}, "phase": "current_phase"}
```

**Prompt injection sanitization (CC2 from `backend-intelligence-upgrade.md`):** 템플릿 변수 `{information_checklist_status}`와 `{missing_information}`에는 사용자 유래 데이터(`key_quotes`, `conflict_topic`)가 포함될 수 있음. 동일한 sanitization 규칙 적용: 시스템 프롬프트에는 카테고리 라벨과 횟수만 사용, 원문 텍스트(필요 시)는 human message context 영역에 배치. 개별 값은 최대 50자로 truncate. LLM 명령어 오버라이드 패턴(`[SYSTEM:`, `ignore previous`, `you are now`, `<system>` 등) strip 처리.

**Model tier:** `get_chat_model(temperature=0.7)` — higher temperature for natural, warm conversation.

---

### Layer 2: Data Collection Sources

The system aggregates data from all app touchpoints, not just chat.

```python
# File: backend/apps/intelligence/services/data_collector.py

class TherapyDataCollector:
    """Aggregates data from all app sources into a unified intelligence context.

    Data sources:
    1. Chat conversations (Message model)
    2. Daily check-ins (DailyCheckIn model)
    3. Audio recordings (AudioRecording + TranscriptSegment models)
    4. Activity engagement (CoupleActivity model)
    5. Detected patterns (Pattern + InsightSummary models)
    6. User profile (UserProfile + UserGoals models)
    7. Weekly summaries (WeeklySummary model)
    """

    def __init__(self, user_id: str):
        self.user_id = user_id

    def collect_therapy_context(self, lookback_days: int = 14) -> TherapyIntelligenceContext:
        """Collect all available data for analysis.

        Args:
            lookback_days: How far back to look for data (default 14 days)

        Returns:
            TherapyIntelligenceContext with all aggregated data
        """
        return TherapyIntelligenceContext(
            user_profile=self._get_user_profile(),
            mood_data=self._get_mood_trajectory(lookback_days),
            conversation_data=self._get_conversation_summaries(lookback_days),
            pattern_data=self._get_accumulated_patterns(lookback_days),
            audio_data=self._get_audio_insights(lookback_days),
            activity_data=self._get_activity_engagement(lookback_days),
            weekly_summaries=self._get_weekly_summaries(lookback_days),
            health_score_data=self._get_health_score_data(),
            conflict_checklist=self._get_conflict_information(),
        )
```

```python
# File: backend/apps/intelligence/models.py

class TherapyIntelligenceContext(TypedDict):
    """Unified context for multi-agent analysis.

    This is what the analysis agents receive — a comprehensive
    view of the user's therapy journey, not just a single message.
    """

    # Static profile
    user_profile: dict              # attachment_style, conflict_style, goals

    # Mood trajectory (from DailyCheckIn)
    mood_data: dict                 # {
                                    #   "recent_moods": [4, 3, 2, 2, 3],
                                    #   "trend": "declining",
                                    #   "average": 2.8,
                                    #   "notes": ["스트레스 많음", ...]
                                    # }

    # Conversation intelligence (from Messages + ConversationSummary)
    conversation_data: dict         # {
                                    #   "session_count": 5,
                                    #   "total_messages": 47,
                                    #   "conflict_topics": ["finance", "communication"],
                                    #   "key_quotes": [...],
                                    #   "conversation_summaries": [...]
                                    # }

    # Pattern intelligence (from Pattern + InsightSummary)
    pattern_data: dict              # {
                                    #   "trigger_phrases": [...],
                                    #   "recurring_topics": [...],
                                    #   "escalation_scores": [3, 5, 4],
                                    #   "escalation_trend": "worsening"
                                    # }

    # Audio intelligence (from AudioRecording + TranscriptSegment)
    audio_data: dict                # {
                                    #   "recording_count": 2,
                                    #   "avg_emotion_intensity": 7,
                                    #   "speaker_dynamics": {...}
                                    # }

    # Activity engagement (from CoupleActivity)
    activity_data: dict             # {
                                    #   "completed_count": 3,
                                    #   "avg_rating": 3.5,
                                    #   "engagement_trend": "declining"
                                    # }

    # Weekly trend summaries (from WeeklySummary)
    weekly_summaries: list[dict]

    # Health score data (from DailyHealthScore — see backend-intelligence-upgrade.md C1)
    health_score_data: dict | None  # {
                                    #   "current_score": 72,
                                    #   "week_ago_score": 80,
                                    #   "trend": "declining",
                                    #   "weakest_component": "escalation"
                                    # }

    # Conflict information checklist (from chat agent)
    conflict_checklist: dict        # Current state of information gathering
```

---

### Layer 3: Analysis Trigger Service

The trigger service evaluates whether accumulated data is sufficient for analysis. It runs periodically (Celery beat) and on specific events.

```python
# File: backend/apps/intelligence/services/trigger_service.py

class AnalysisTriggerService:
    """Determines when to dispatch multi-agent analysis.

    Evaluation happens:
    1. Periodically via Celery beat (e.g., daily at midnight)
    2. After specific events (conversation ended, check-in submitted, pattern detected)

    Trigger tiers (in priority order):
    - CRITICAL: Safety/crisis signals → immediate
    - THRESHOLD: Escalation/mood breach → within hours
    - SUFFICIENCY: Enough data accumulated → next analysis window
    - PERIODIC: Weekly scheduled analysis → weekly cycle
    """

    class TriggerTier:
        CRITICAL = "critical"       # Immediate dispatch
        THRESHOLD = "threshold"     # High priority, within hours
        SUFFICIENCY = "sufficiency" # Standard, next analysis window
        PERIODIC = "periodic"       # Scheduled cycle

    # Configurable thresholds (in settings/base.py)
    # ANALYSIS_TRIGGER_CONFIG = {
    #     'min_conversations': 3,
    #     'min_messages_per_conversation': 5,
    #     'min_checkin_days': 3,
    #     'escalation_threshold': 7,       # out of 10
    #     'mood_decline_days': 3,          # consecutive declining days
    #     'weekly_analysis_day': 0,        # Monday
    #     'cooldown_hours': 48,            # Min hours between analyses
    # }

    def evaluate(self, user_id: str) -> TriggerResult:
        """Evaluate whether analysis should be triggered for a user.

        Returns:
            TriggerResult with should_trigger, tier, and reason
        """
        context = TherapyDataCollector(user_id).collect_therapy_context()

        # Tier 1: Critical — safety signals
        if self._check_critical_signals(context):
            return TriggerResult(
                should_trigger=True,
                tier=self.TriggerTier.CRITICAL,
                reason="Safety signal detected in accumulated data",
            )

        # Tier 2: Threshold breach
        if self._check_threshold_breach(context):
            return TriggerResult(
                should_trigger=True,
                tier=self.TriggerTier.THRESHOLD,
                reason="Escalation or mood threshold breached",
            )

        # Tier 3: Data sufficiency
        if self._check_data_sufficiency(context):
            return TriggerResult(
                should_trigger=True,
                tier=self.TriggerTier.SUFFICIENCY,
                reason="Sufficient data accumulated for meaningful analysis",
            )

        # Tier 4: Periodic (checked by Celery beat schedule)
        if self._check_periodic_schedule(context):
            return TriggerResult(
                should_trigger=True,
                tier=self.TriggerTier.PERIODIC,
                reason="Scheduled weekly analysis",
            )

        return TriggerResult(should_trigger=False)

    def _check_critical_signals(self, context) -> bool:
        """Check for abuse patterns, crisis indicators across all data."""
        # High emotion intensity in audio + declining mood + escalation pattern
        # This catches nuanced signals that single-message safety can't
        ...

    def _check_threshold_breach(self, context) -> bool:
        """Check if escalation score, mood trajectory, or health score crossed thresholds."""
        mood = context["mood_data"]
        patterns = context["pattern_data"]

        # Mood declining for N consecutive days
        if mood.get("trend") == "declining" and mood.get("decline_days", 0) >= 3:
            return True

        # Escalation trend worsening
        if patterns.get("escalation_trend") == "worsening":
            scores = patterns.get("escalation_scores", [])
            if scores and scores[-1] >= 7:
                return True

        # Health score sharp decline (see backend-intelligence-upgrade.md C1)
        # Requires DailyHealthScore from patterns app
        health = context.get("health_score_data")
        if health:
            current = health.get("current_score")
            week_ago = health.get("week_ago_score")
            if current and week_ago and (week_ago - current) >= 15:
                return True

        return False

    def _check_data_sufficiency(self, context) -> bool:
        """Check if enough data has been collected for meaningful analysis."""
        conv = context["conversation_data"]
        checklist = context["conflict_checklist"]

        # Need minimum conversations with substantial content
        if conv.get("session_count", 0) < 3:
            return False

        # Conflict information should be substantially gathered
        checklist_completion = sum(1 for v in checklist.values() if v) / max(len(checklist), 1)
        if checklist_completion < 0.6:
            return False

        # Check cooldown — don't re-analyze too soon
        if self._within_cooldown(context):
            return False

        return True

    def _check_periodic_schedule(self, context) -> bool:
        """Check if it's time for the weekly scheduled analysis."""
        ...
```

```python
# Celery tasks for trigger evaluation
# File: backend/apps/intelligence/tasks.py

@shared_task
def evaluate_analysis_triggers():
    """Periodic task: evaluate all active users for analysis triggers.

    Scheduled via Celery beat (e.g., daily at midnight KST).
    """
    active_users = get_active_users(last_activity_days=7)
    for user_id in active_users:
        result = AnalysisTriggerService().evaluate(user_id)
        if result.should_trigger:
            dispatch_multi_agent_analysis.delay(
                user_id=user_id,
                tier=result.tier,
                reason=result.reason,
            )


@shared_task
def on_conversation_ended(conversation_id: str, user_id: str):
    """Event-driven trigger: evaluate after a conversation session ends."""
    result = AnalysisTriggerService().evaluate(user_id)
    if result.should_trigger:
        dispatch_multi_agent_analysis.delay(
            user_id=user_id,
            tier=result.tier,
            reason=result.reason,
        )


@shared_task
def on_checkin_submitted(user_id: str):
    """Event-driven trigger: evaluate after a daily check-in."""
    result = AnalysisTriggerService().evaluate(user_id)
    if result.should_trigger and result.tier in ("critical", "threshold"):
        # Only dispatch on urgent signals from check-in
        dispatch_multi_agent_analysis.delay(
            user_id=user_id,
            tier=result.tier,
            reason=result.reason,
        )
```

---

### Layer 4: Analysis Agents (Multi-Agent on Accumulated Data)

When the trigger fires, analysis agents receive the **full TherapyIntelligenceContext** — not a single message. This is the fundamental difference from the previous plan.

#### Agent Execution Graph

```
[Trigger fires]
    |
    v
[Data Collection] -- TherapyDataCollector gathers all sources
    |
    v
[Pattern Analyst] + [Emotion Interpreter]  (PARALLEL)
    |                    |
    +--------+-----------+
             |
    [Balance Mediator]  (waits for both)
             |
    [Resolution Strategist]
             |
    [Response Synthesizer] -- merges into insight report
             |
    [Ethics Guardian] -- validates safety
             |
    [Insight Store] -- saves for delivery
```

#### 1. Pattern Analyst (패턴 분석가)

**Role:** Analyzes patterns across ALL accumulated data — not a single message.

**Input:** `TherapyIntelligenceContext` (full accumulated data)

**Output:**
```python
{
    "cross_session_patterns": list[str],    # Patterns spanning multiple conversations
    "trigger_map": dict,                     # {topic: [trigger_phrases]}
    "escalation_trajectory": str,            # "improving" | "stable" | "worsening"
    "communication_style_analysis": str,     # Analysis of user's communication patterns
    "recurring_conflict_cycle": str | None,  # Description of repeating conflict cycle
    "data_sources_used": list[str],          # Which data sources informed the analysis
}
```

**System Prompt (Korean):**
```
당신은 커플 소통 패턴 분석 전문가입니다.

## 역할
여러 세션에 걸쳐 수집된 데이터를 종합 분석하여 소통 패턴을 식별합니다.
단일 메시지가 아닌, 전체 맥락을 봅니다.

## 분석 데이터
대화 이력: {conversation_summaries}
기분 추이: {mood_trajectory}
감지된 패턴: {detected_patterns}
오디오 데이터: {audio_insights}
사용자 프로필: {user_profile}

## 분석 프레임워크
1. 교차 세션 패턴: 여러 대화에서 반복되는 갈등 구조
2. 트리거 지도: 어떤 주제/상황이 갈등을 촉발하는지
3. 에스컬레이션 궤적: 시간에 따른 갈등 강도 변화 방향
4. 소통 스타일: 사용자의 갈등 대응 방식 분석
5. 갈등 순환: 반복되는 갈등 사이클이 있는지

## 규칙
- 충분한 데이터가 없는 영역은 "데이터 부족"으로 표시
- 판단하지 말고 관찰만 하세요
- 데이터 출처를 명시하세요 (어떤 대화, 어떤 체크인 등)
- 한국어 격식체 사용
```

**Model tier:** `get_chat_model(temperature=0.3)` — analytical precision.


#### 2. Emotion Interpreter (감정 해석가)

**Role:** Maps emotional trajectory across sessions. Identifies emotional patterns, not just single-message emotions.

**Input:** `TherapyIntelligenceContext`

**Output:**
```python
{
    "emotional_trajectory": str,            # Narrative of emotional journey
    "dominant_emotions": list[str],         # Most frequent emotions across sessions
    "unmet_needs": list[str],               # Recurring unmet needs
    "attachment_dynamics": str,             # How attachment style plays out in data
    "emotional_turning_points": list[dict], # Key moments that shifted emotions
    "mood_correlation": str,                # How check-in moods correlate with conversations
}
```

**Model tier:** `get_chat_model(temperature=0.5)` — empathic nuance.


#### 3. Balance Mediator (균형 중재자)

**Role:** Constructs a balanced perspective from accumulated data. Can now see BOTH sides more clearly because data spans multiple conversations.

**Input:** `TherapyIntelligenceContext` + Pattern Analyst output + Emotion Interpreter output

**Output:**
```python
{
    "user_perspective_summary": str,        # User's accumulated viewpoint
    "partner_perspective_inferred": str,    # Partner's likely viewpoint (from user's descriptions)
    "communication_gap_analysis": str,      # Where and why communication breaks down
    "balance_assessment": str,              # "balanced" | "leans_user" | "leans_partner"
    "bridge_opportunities": list[str],      # Where perspectives overlap or can connect
}
```

**Model tier:** `get_chat_model(temperature=0.4)` — balanced reasoning.


#### 4. Resolution Strategist (해결 전략가)

**Role:** Generates concrete, actionable suggestions based on accumulated analysis — not reactive single-message advice.

**Input:** `TherapyIntelligenceContext` + all prior agent outputs

**Output:**
```python
{
    "long_term_suggestions": list[str],     # 2-3 ongoing practice suggestions
    "immediate_actions": list[str],         # 2-3 things to try this week
    "conversation_starters": list[str],     # Exact phrases to use with partner
    "activity_recommendations": list[str],  # App activities that match their needs
    "difficulty_progression": str,          # Suggested order of difficulty
    "personalization_notes": str,           # How suggestions fit their conflict_style
}
```

**Model tier:** `get_chat_model(temperature=0.6)` — creative yet practical.


#### 5. Ethics Guardian (윤리 보호자)

**Role:** Validates all analysis outputs for safety and therapeutic boundaries. Unchanged in principle from previous plan — always runs, never skipped.

**Input:** Synthesized insight report + all agent outputs

**Output:**
```python
{
    "approved": bool,
    "safety_flags": list[str],
    "modifications_needed": list[str],
    "risk_level": str,                      # "safe" | "caution" | "block"
    "professional_referral": bool,
    "referral_resources": list[str],
}
```

**Critical safety rule:** Ethics Guardian uses primary chat model (not cheap model). Safety validation in a therapy app requires nuanced reasoning. On failure, defaults to BLOCK (fail-safe).

**Model tier:** `get_chat_model(temperature=0.1)` — deterministic safety.

---

### Layer 5: Insight Delivery

Insights are delivered through two channels:

#### Channel 1: In-Conversation Delivery

When the user next opens a chat, the chat agent has access to completed analysis. It naturally weaves insights into conversation:

```
User: "오늘도 남편이랑 말다툼했어요..."
AI: "그러셨군요, 힘드셨겠어요. 최근 며칠 동안 이야기를 나누면서 제가 발견한 것이 있는데,
     공유해도 괜찮으실까요?"
User: "네, 말해주세요"
AI: "지난 세 번의 대화에서 재정 관련 결정이 갈등의 시작점이 되는 패턴이 보였어요.
     특히 상대방이 먼저 결정을 내리고 나중에 알려주는 상황에서 무시당한다는 감정이
     반복적으로 나타나더라고요..."
```

**Key rules:**
- ALWAYS ask permission before sharing analysis ("공유해도 괜찮으실까요?")
- Never dump the entire analysis at once — share in digestible pieces
- Maintain therapeutic tone — insights are observations, not diagnoses
- If user declines, respect it and continue normal conversation

```python
# In-conversation insight delivery state
class InsightDeliveryState(TypedDict, total=False):
    """Tracks insight delivery within a conversation."""
    pending_insights: list[dict]        # Insights ready to share
    insights_offered: bool              # Have we asked permission?
    user_consented: bool                # Did user agree to hear insights?
    insights_delivered: list[str]       # Which insights have been shared
    delivery_phase: str                 # "pending" | "offered" | "delivering" | "complete"
```

#### Channel 2: Insight Report (Separate Screen)

A structured report delivered as a viewable page in the app:

```python
# File: backend/apps/intelligence/models.py

class InsightReport(models.Model):
    """Stored analysis report for app display."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    couple = models.ForeignKey('couples.Couple', on_delete=models.CASCADE, null=True)

    # Trigger metadata
    trigger_tier = models.CharField(max_length=20)   # critical/threshold/sufficiency/periodic
    trigger_reason = models.TextField()
    data_period_start = models.DateField()
    data_period_end = models.DateField()

    # Agent outputs (encrypted)
    pattern_analysis = EncryptedTextField(null=True)
    emotion_analysis = EncryptedTextField(null=True)
    balance_analysis = EncryptedTextField(null=True)
    resolution_suggestions = EncryptedTextField(null=True)
    ethics_review = models.JSONField(default=dict)

    # Synthesized report
    report_title = models.CharField(max_length=200)       # Korean title
    report_summary = EncryptedTextField()                  # 2-3 paragraph Korean summary
    key_insights = models.JSONField(default=list)          # Bullet-point insights
    suggested_actions = models.JSONField(default=list)     # Actionable suggestions
    recommended_activities = models.JSONField(default=list) # App activity IDs

    # Delivery tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True)
    in_conversation_delivered = models.BooleanField(default=False)

    # Status
    status = models.CharField(max_length=20, default='pending')  # pending/ready/delivered/expired

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'insight_reports'
        ordering = ['-created_at']
```

**Report API endpoint:**
```python
# GET /api/intelligence/reports/          -- list user's reports
# GET /api/intelligence/reports/{id}/     -- get specific report
# POST /api/intelligence/reports/{id}/read/ -- mark as read
```

---

### Analysis LangGraph Design

```python
# File: backend/apps/intelligence/services/analysis_graph.py

from langgraph.graph import StateGraph, START, END


class AnalysisState(TypedDict, total=False):
    """State for the multi-agent analysis graph.

    NOTE: This graph runs on accumulated data (TherapyIntelligenceContext),
    NOT on a single user message. This is a background analysis job.
    """
    # Input (set by trigger dispatcher)
    user_id: str
    trigger_tier: str
    trigger_reason: str
    therapy_context: dict               # TherapyIntelligenceContext

    # Agent outputs
    pattern_analysis: dict | None
    emotion_analysis: dict | None
    balance_analysis: dict | None
    resolution_strategy: dict | None
    ethics_review: dict | None

    # Synthesized output
    report_title: str
    report_summary: str
    key_insights: list[str]
    suggested_actions: list[str]
    recommended_activities: list[str]

    # Metadata
    agents_executed: Annotated[list[str], operator.add]
    total_token_count: int
    execution_time_ms: int


def build_analysis_graph(
    model_factory: Callable[[str, float], BaseChatModel],
) -> StateGraph:
    """Build the multi-agent analysis StateGraph.

    Each agent receives the full TherapyIntelligenceContext.

    Args:
        model_factory: Function(agent_name, temperature) -> model instance
            Allows per-agent model/temperature configuration.

    Returns:
        Compiled StateGraph for background execution
    """
    graph = StateGraph(AnalysisState)

    # Add nodes
    graph.add_node("pattern_analyst", pattern_node)
    graph.add_node("emotion_interpreter", emotion_node)
    graph.add_node("balance_mediator", balance_node)
    graph.add_node("resolution_strategist", resolution_node)
    graph.add_node("report_synthesizer", synthesizer_node)
    graph.add_node("ethics_guardian", ethics_node)

    # Pattern + Emotion run in parallel
    graph.add_edge(START, "pattern_analyst")
    graph.add_edge(START, "emotion_interpreter")

    # Both feed into Balance Mediator (fan-in: waits for both)
    graph.add_edge("pattern_analyst", "balance_mediator")
    graph.add_edge("emotion_interpreter", "balance_mediator")

    # Balance -> Resolution -> Synthesizer -> Ethics
    graph.add_edge("balance_mediator", "resolution_strategist")
    graph.add_edge("resolution_strategist", "report_synthesizer")
    graph.add_edge("report_synthesizer", "ethics_guardian")
    graph.add_edge("ethics_guardian", END)

    return graph
```

**Key difference from previous plan:** No supervisor/router node. The trigger service already determined this analysis should run. All 5 agents always execute because analysis is triggered only when sufficient data exists.

**Model factory pattern (addresses previous plan's temperature issue):**
```python
# In config/settings/base.py:
ANALYSIS_AGENT_CONFIG = {
    'pattern_analyst': {'model_tier': 'chat', 'temperature': 0.3, 'max_tokens': 1024},
    'emotion_interpreter': {'model_tier': 'chat', 'temperature': 0.5, 'max_tokens': 1024},
    'balance_mediator': {'model_tier': 'chat', 'temperature': 0.4, 'max_tokens': 1024},
    'resolution_strategist': {'model_tier': 'chat', 'temperature': 0.6, 'max_tokens': 1024},
    'ethics_guardian': {'model_tier': 'chat', 'temperature': 0.1, 'max_tokens': 512},
    'report_synthesizer': {'model_tier': 'chat', 'temperature': 0.5, 'max_tokens': 2048},
}

def create_model_factory():
    def factory(agent_name: str) -> BaseChatModel:
        config = settings.ANALYSIS_AGENT_CONFIG[agent_name]
        if config['model_tier'] == 'chat':
            return get_chat_model(
                temperature=config['temperature'],
                max_tokens=config['max_tokens'],
                streaming=False,
            )
        return get_summarization_model(
            temperature=config['temperature'],
            max_tokens=config['max_tokens'],
        )
    return factory
```

---

### Safety Architecture

Safety operates at three levels:

```
Level 1: Per-Message Safety (unchanged, real-time)
  check_safety() keyword pre-filter → immediate response
  detect_crisis() → CrisisEvent + safety response
  → These stay in views.py, unchanged

Level 2: Chat Agent Safety (real-time)
  Chat agent monitors emotional intensity per message
  High intensity → adjusts response tone (more calming)
  Mild safety keywords → flags in ConflictInformation
  → No separate LLM call, part of chat agent's response

Level 3: Analysis Safety (background, on accumulated data)
  Ethics Guardian validates all analysis outputs
  Cross-source abuse detection (mood + patterns + audio)
  Professional referral based on accumulated severity
  → Runs only when analysis is triggered
```

---

## Task Flow

### Task 1: Chat Agent Refactoring
**New files:**
- `backend/apps/chat/services/chat_agent/__init__.py`
- `backend/apps/chat/services/chat_agent/information_state.py` — ConflictInformation, ChatAgentState
- `backend/apps/chat/services/chat_agent/chat_graph.py` — Chat agent LangGraph
- `backend/apps/chat/prompts/chat_agent_prompts.py` — Therapeutic listener prompts

**Modified files:**
- `backend/apps/chat/services/reframing_graph.py` — Feature flag dispatch to new chat agent
- `backend/apps/chat/views.py` — Pass information state, handle insight delivery
- `backend/config/settings/base.py` — Add `ACCUMULATIVE_THERAPY_ENABLED` flag

**What it does:**
1. Replace the "analyze and respond" chat behavior with "listen and gather"
2. Implement information checklist tracking per conversation
3. Chat agent follows phase-based conversation strategy
4. When feature flag is off, falls back to current single-call pipeline

**Acceptance Criteria:**
- Chat agent asks therapeutic questions, does NOT provide analysis
- Information checklist updates correctly across messages
- Conversation phase transitions naturally
- Feature flag toggles between old and new behavior
- Korean language quality matches or exceeds current system


### Task 2: Intelligence Data Layer
**New files:**
- `backend/apps/intelligence/__init__.py`
- `backend/apps/intelligence/models.py` — InsightReport model
- `backend/apps/intelligence/admin.py`
- `backend/apps/intelligence/services/__init__.py`
- `backend/apps/intelligence/services/data_collector.py` — TherapyDataCollector
- `backend/apps/intelligence/migrations/0001_initial.py`

**Modified files:**
- `backend/config/settings/base.py` — Add `apps.intelligence` to INSTALLED_APPS

**What it does:**
1. Create `TherapyDataCollector` that aggregates from all existing models
2. Create `InsightReport` model for storing analysis results
3. No changes to existing models — reads from them

**Acceptance Criteria:**
- TherapyDataCollector successfully queries all data sources
- Returns complete TherapyIntelligenceContext
- Handles missing data gracefully (new users, no check-ins, no audio)
- InsightReport model migration runs cleanly


### Task 3: Analysis Trigger Service
**New files:**
- `backend/apps/intelligence/services/trigger_service.py` — AnalysisTriggerService
- `backend/apps/intelligence/tasks.py` — Celery tasks for trigger evaluation

**Modified files:**
- `backend/config/settings/base.py` — Add `ANALYSIS_TRIGGER_CONFIG`
- `backend/config/celery.py` — Add beat schedule for trigger evaluation

**What it does:**
1. Implement 4-tier trigger evaluation
2. Celery beat task for periodic evaluation
3. Event-driven triggers (conversation ended, check-in submitted)
4. Cooldown management (don't re-analyze too soon)

**Acceptance Criteria:**
- Trigger tiers evaluate correctly against test data
- Cooldown prevents excessive analysis
- Event-driven triggers fire on correct events
- Configurable thresholds via settings


### Task 4: Analysis Agents + Graph
**New files:**
- `backend/apps/intelligence/services/analysis_graph.py` — LangGraph definition
- `backend/apps/intelligence/services/agents/__init__.py`
- `backend/apps/intelligence/services/agents/pattern_analyst.py`
- `backend/apps/intelligence/services/agents/emotion_interpreter.py`
- `backend/apps/intelligence/services/agents/balance_mediator.py`
- `backend/apps/intelligence/services/agents/resolution_strategist.py`
- `backend/apps/intelligence/services/agents/ethics_guardian.py`
- `backend/apps/intelligence/services/agents/report_synthesizer.py`
- `backend/apps/intelligence/prompts/analysis_prompts.py` — All Korean system prompts

**What it does:**
1. Build 5 analysis agents that operate on TherapyIntelligenceContext
2. LangGraph with parallel Pattern+Emotion, then sequential Balance→Resolution
3. Report Synthesizer produces Korean insight report
4. Ethics Guardian validates everything
5. Results stored in InsightReport model

**Acceptance Criteria:**
- All agents process TherapyIntelligenceContext correctly
- Parallel execution of Pattern + Emotion works
- Ethics Guardian blocks unsafe analysis
- Report stored with all required fields
- Korean quality in all outputs
- Handles partial data (missing audio, no patterns) gracefully


### Task 5: Insight Delivery
**New files:**
- `backend/apps/intelligence/views.py` — Report API endpoints
- `backend/apps/intelligence/serializers.py`
- `backend/apps/intelligence/urls.py`
- `backend/apps/chat/services/chat_agent/insight_delivery.py` — In-conversation delivery logic

**Modified files:**
- `backend/config/urls.py` — Add intelligence URLs

**What it does:**
1. API endpoints for mobile app to fetch insight reports
2. In-conversation delivery: chat agent checks for pending insights
3. Permission-based: asks user before sharing analysis
4. Push notification when new report is ready

**Acceptance Criteria:**
- Report API returns correct data
- Chat agent asks permission before sharing insights
- User can decline insight delivery
- Push notification fires for new reports
- Report marked as read correctly


### Task 6: Testing
**New files:**
- `backend/apps/intelligence/tests/test_data_collector.py`
- `backend/apps/intelligence/tests/test_trigger_service.py`
- `backend/apps/intelligence/tests/test_analysis_graph.py`
- `backend/apps/intelligence/tests/test_insight_delivery.py`
- `backend/apps/chat/tests/test_chat_agent.py`

**Required test coverage:**
- Data collector: aggregation from each source, missing data handling
- Trigger service: each tier, cooldown, threshold configurations
- Analysis graph: agent execution, parallel execution, ethics blocking
- Insight delivery: permission flow, report API, in-conversation delivery
- Chat agent: information checklist, phase transitions, no-analysis rule


### Task 7: Documentation
**New files:**
- `backend/apps/intelligence/README.md` — System architecture documentation

---

## Dependency Graph

```
Task 1 (Chat Agent) ────────────────────────┐
                                             ├──> Task 5 (Insight Delivery)
Task 2 (Intelligence Data Layer)             │       depends on 1, 2, 4
  |                                          │
  v                                          │
Task 3 (Trigger Service) -- depends on 2     │
  |                                          │
  v                                          │
Task 4 (Analysis Agents) -- depends on 2, 3 ─┘
  |
Task 6 (Testing) -- can start after Task 2, runs alongside 3-5
  |
Task 7 (Documentation) -- runs alongside 5-6
```

Tasks 1 and 2 can start in parallel (no dependency).

---

## Files Impact Summary

| File | Task | Change Type |
|------|------|-------------|
| `chat/services/chat_agent/__init__.py` | 1 | NEW |
| `chat/services/chat_agent/information_state.py` | 1 | NEW |
| `chat/services/chat_agent/chat_graph.py` | 1 | NEW |
| `chat/services/chat_agent/insight_delivery.py` | 5 | NEW |
| `chat/prompts/chat_agent_prompts.py` | 1 | NEW |
| `chat/services/reframing_graph.py` | 1 | MODIFY (feature flag) |
| `chat/views.py` | 1, 5 | MODIFY (chat agent + insight delivery) |
| `intelligence/__init__.py` | 2 | NEW |
| `intelligence/models.py` | 2 | NEW |
| `intelligence/admin.py` | 2 | NEW |
| `intelligence/services/__init__.py` | 2 | NEW |
| `intelligence/services/data_collector.py` | 2 | NEW |
| `intelligence/services/trigger_service.py` | 3 | NEW |
| `intelligence/tasks.py` | 3 | NEW |
| `intelligence/services/analysis_graph.py` | 4 | NEW |
| `intelligence/services/agents/*.py` (6 files) | 4 | NEW |
| `intelligence/prompts/analysis_prompts.py` | 4 | NEW |
| `intelligence/views.py` | 5 | NEW |
| `intelligence/serializers.py` | 5 | NEW |
| `intelligence/urls.py` | 5 | NEW |
| `intelligence/tests/*.py` (5 files) | 6 | NEW |
| `intelligence/README.md` | 7 | NEW |
| `config/settings/base.py` | 1, 2, 3 | MODIFY |
| `config/urls.py` | 5 | MODIFY |
| `config/celery.py` | 3 | MODIFY |
| `intelligence/migrations/0001_initial.py` | 2 | NEW (auto-generated) |

**Total: ~25 new files, 5 modified files. 1 new database migration (InsightReport). 0 new dependencies (uses existing langgraph, celery).**

---

## Migration Strategy

### Phase 1: Chat Agent Transformation (Week 1-2)
- Deploy chat agent with `ACCUMULATIVE_THERAPY_ENABLED=False` (default)
- When off: current single-call pipeline (unchanged)
- Internal testing of therapeutic listener behavior

### Phase 2: Intelligence Layer (Week 2-3)
- Deploy data collector and trigger service
- Run triggers in shadow mode (evaluate but don't dispatch)
- Validate data aggregation accuracy

### Phase 3: Analysis Agents (Week 3-4)
- Enable analysis graph execution
- Run analyses but don't deliver to users yet
- Compare analysis quality against manual review

### Phase 4: Insight Delivery (Week 4-5)
- Enable in-conversation insight delivery
- Enable report API for mobile app
- Monitor user engagement with insights

### Phase 5: Full Rollout (Week 5+)
- Set `ACCUMULATIVE_THERAPY_ENABLED=True` as default
- Monitor key metrics
- Iterate on trigger thresholds based on real usage

### Backward Compatibility
- **API contract:** Existing chat endpoints unchanged. New report endpoints are additive.
- **Database:** One new model (InsightReport). No changes to existing models.
- **Mobile app:** Chat works as before. Report screen is a new feature (requires app update).
- **Existing conversations:** Continue working. Chat agent behavior changes only when flag is on.

### Cross-Document Integration with `backend-intelligence-upgrade.md`

이 문서와 `backend-intelligence-upgrade.md`는 같은 시스템의 다른 계층을 다룹니다. 동시에 수정되는 파일의 작업 순서:

| 순서 | 작업 | 문서 | 선행 조건 |
|------|------|------|-----------|
| 1 | I1: Django Cache 설정 | backend-intelligence-upgrade | 없음 |
| 2 | I2: Database Index Migration | backend-intelligence-upgrade | 없음 |
| 3 | Task 1: Chat Agent Refactoring (파일 생성) | accumulative-therapy-system | 없음 |
| 4 | Task 2: Intelligence Data Layer | accumulative-therapy-system | 없음 |
| 5 | A1: UserIntelligenceService | backend-intelligence-upgrade | I1 |
| 6 | A2: Dynamic Prompt Builder | backend-intelligence-upgrade | Task 1 (`chat_agent_prompts.py` 생성 후) |
| 7 | A3: Chat Agent Pipeline 연결 | backend-intelligence-upgrade | Task 1, A1, A2 |
| 8 | Task 3: Trigger Service | accumulative-therapy-system | Task 2 |
| 9 | B, C, E Workstreams | backend-intelligence-upgrade | A1 (B2, C1), 독립 (B1, E) |
| 10 | Task 4: Analysis Agents | accumulative-therapy-system | Task 2, 3 |
| 11 | D: Recommendations | backend-intelligence-upgrade | A1, C1 |
| 12 | Task 5: Insight Delivery | accumulative-therapy-system | Task 1, 2, 4 |
| 13 | F Workstream | backend-intelligence-upgrade | C1 |
| 14 | Task 6-7: Testing + Documentation | accumulative-therapy-system | Task 2+ |

동시 수정 파일 조율:
- **`chat/views.py`**: Task 1 (채팅 에이전트) → A3 (user_context) → Task 5 (인사이트 전달) 순서
- **`config/settings/base.py`**: I1 (CACHES) → Task 1 (feature flag) → Task 2 (INSTALLED_APPS) → Task 3 (trigger config)
- **`config/celery.py`**: Task 3 (trigger beat) + C3 (health score beat) — 독립적, 병합 가능
- **`chat/prompts/chat_agent_prompts.py`**: Task 1 (파일 생성) → A2 (개인화 섹션 추가)

---

## Success Criteria

1. **Chat agent quality:** Users rate therapeutic listener responses equal or higher than current analysis responses (measured via conversation ratings)
2. **Information gathering:** Chat agent achieves 60%+ checklist completion within 5 conversations for active users
3. **Trigger accuracy:** Analysis triggers fire at appropriate moments — not too early (insufficient data), not too late (missed intervention window)
4. **Analysis depth:** Multi-agent analysis on accumulated data produces demonstrably richer insights than per-message analysis (measured via manual review)
5. **Safety parity:** Ethics Guardian catches all cases that current safety catches, plus cross-source patterns
6. **Insight engagement:** 50%+ of delivered insight reports are read by users
7. **In-conversation acceptance:** 70%+ of users accept when asked "Would you like me to share what I've noticed?"
8. **Cost efficiency:** Chat interactions cost same as current (1-2 LLM calls). Analysis cost amortized over days, not per-message.
9. **Latency:** Chat responses under 3 seconds (no multi-agent overhead). Analysis runs async (no user-facing latency).
10. **Korean quality:** All outputs are natural Korean with consistent honorific style
