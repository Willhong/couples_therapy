# Multi-Agent Therapy Pipeline Plan (v2 - Post-Review Revision)
# CouplesAI: LangGraph Multi-Agent System with 5 Specialized Agents

> **Status:** DRAFT v2 - Post Architect+Critic Review
> **Replaces:** Single-call architecture in `reframing_graph.py`
> **Integrates with:** Backend Intelligence Upgrade Plan (Workstream A provides personalized context)
> **LangGraph Pattern:** `StateGraph` with conditional edges + parallel branches (NOT `create_supervisor()`)
>
> **Revision Notes (v2):** Incorporates all feedback from Architect review (10 concerns) and Critic review (9 concerns). Key changes: concrete parallel execution code via dual edges from supervisor node, asyncio.run() risk documented with migration path, Ethics Guardian upgraded to chat model, audio/views.py added to integration scope, Ethics Guardian block/caution handling specified, API response shape corrected, Annotated list types for state accumulation, error handling in agent nodes, template placeholder fallback specified, routing matrix LLM counts corrected.

---

## Context

### Current Architecture (Single-Call)
```
user_message
  + conversation_context (rolling summary + recent messages)
  --> check_safety() keyword pre-filter (0 LLM calls)
  --> TWO_MODE_SYSTEM_PROMPT (static Korean prompt)
  --> 1 LLM call (model decides chat vs reframing mode)
  --> JSON response parsed, returned to client
```

**Limitations:**
- One monolithic system prompt handles ALL concerns (empathy, analysis, balance, suggestions, safety)
- No separation of therapeutic expertise -- the LLM must be simultaneously an analyst, mediator, strategist, and ethicist
- Single-shot response with no iterative refinement between specialized perspectives
- Safety checking is keyword-only; no LLM-based nuance detection
- No ability to selectively invoke specialized analysis based on message complexity

### Target Architecture (Multi-Agent)
```
user_message
  + conversation_context
  + user_intelligence_context (from Workstream A UserIntelligenceService)
  --> check_safety() keyword pre-filter (unchanged, 0 LLM calls)
  --> Supervisor Router (1 LLM call: classifies message, selects agents)
  --> Selected Agents run (1-4 LLM calls, parallelizable)
  --> Ethics Guardian validates final output (1 LLM call, conditional)
  --> Response Synthesizer merges agent outputs (1 LLM call)
  --> Structured response returned to client
```

**Token Budget:** 2-6 LLM calls per message (vs current 1). Mitigated by selective routing, cheaper models for some agents, and parallel execution.

---

## Work Objectives

1. Replace the single-call pipeline with a LangGraph supervisor-based multi-agent system
2. Create 5 specialized agents with focused Korean therapy prompts
3. Implement intelligent routing so simple messages use fewer agents (cost control)
4. Maintain backward compatibility with existing API contracts
5. Integrate with Workstream A's `UserIntelligenceService` for personalized context
6. Preserve existing safety infrastructure (keyword pre-filter + crisis detection)

---

## Guardrails

### Must Have
- Feature flag (`MULTI_AGENT_ENABLED`) for gradual rollout; when off, falls back to current single-call pipeline
- All 5 agents produce Korean-language output using consistent honorific style (~입니다, ~세요)
- Ethics Guardian runs on EVERY message (cannot be skipped by router)
- Existing `check_safety()` keyword pre-filter and `detect_crisis()` remain unchanged as first-pass gates
- API response format unchanged. `run_therapy_pipeline()` returns `{mode, final_response, analysis, suggestions, is_abuse_detected, safety_response}`. `views.py` is responsible for mapping: reframing mode uses `final_response` as-is; chat mode maps `final_response` → `message` key; both add `message_id` and `user_message_id` (from view layer, not pipeline)
- Selective routing: simple chat messages invoke only 1-2 agents, not all 5
- Each agent has a max token budget; total response stays within `LLM_MAX_TOKENS` (2048)
- No changes to `llm_service.py` provider abstraction -- agents use `get_chat_model()` and `get_summarization_model()`
- Async-safe: graph execution is async-native (LangGraph graphs are async by default)
- Solo user handling: agents work without couple context (graceful degradation)

### Must NOT Have
- No changes to existing Django models (`Message`, `Conversation`, `SharedReframing`)
- No changes to WebSocket consumer (`consumers.py`) -- it handles sharing, not AI responses
- No new LLM provider integrations (use existing `_PROVIDER_FACTORIES`)
- No removal of existing `TWO_MODE_SYSTEM_PROMPT` or `COMFORT_MODE_PROMPT` (kept as fallback)
- No new API endpoints -- replace internal pipeline logic only
- No database migrations in this plan (agent outputs stored in existing `reframing_data` JSON field)

---

## Architecture Design

### Agent Definitions

#### 1. Pattern Analyst (패턴 분석가)

**Role:** Identifies communication patterns, conflict triggers, and recurring dynamics. Maps the current conflict to historical patterns when `user_intelligence_context` is available.

**When invoked:** Reframing mode messages only. Skipped for simple chat/emotional venting.

**Input:**
```python
{
    "user_message": str,
    "conversation_context": str,
    "user_intelligence": dict | None,  # From Workstream A
}
```

**Output:**
```python
{
    "communication_pattern": str,       # e.g., "비난-방어 패턴"
    "trigger_identified": str,          # e.g., "재정 관련 결정에서 의견 불일치"
    "recurring_pattern": bool,          # True if matches known patterns
    "pattern_context": str,             # Korean explanation of the pattern
    "escalation_risk": str,             # "low" | "moderate" | "high"
    "original_quotes": list[str],       # Direct quotes from user message
}
```

**System Prompt (Korean):**
```
당신은 커플 소통 패턴 분석 전문가입니다.

## 역할
사용자의 메시지에서 소통 패턴과 갈등 트리거를 식별합니다.

## 분석 프레임워크
1. 소통 패턴 분류: 비난-방어, 회피-추구, 경멸-위축, 건설적 대화
2. 트리거 식별: 어떤 주제/상황/표현이 갈등을 촉발했는지
3. 반복 패턴 확인: 사용자 프로필의 과거 패턴과 비교
4. 에스컬레이션 위험: 현재 대화의 감정 강도와 방향

## 사용자 프로필 활용
{user_profile_section}  <!-- Injected from Workstream A context -->

## 규칙
- 사용자의 원래 메시지에서 직접 인용하여 근거를 제시하세요
- 패턴 이름은 전문 용어와 쉬운 설명을 함께 제공하세요
- 판단하지 말고 관찰만 하세요 (누가 맞고 틀린지 절대 언급 금지)
- 한국어 격식체 사용

## 출력 형식
반드시 유효한 JSON으로만 응답하세요.
{"communication_pattern": "...", "trigger_identified": "...", "recurring_pattern": true/false, "pattern_context": "...", "escalation_risk": "low/moderate/high", "original_quotes": ["..."]}
```

**Model tier:** `get_chat_model(temperature=0.3)` -- low temperature for analytical precision.


#### 2. Emotion Interpreter (감정 해석가)

**Role:** Reads emotional undertones, attachment dynamics, and unspoken needs beneath the surface of the message. Maps emotions to attachment theory frameworks.

**When invoked:** Always invoked (every message benefits from emotional understanding).

**Input:**
```python
{
    "user_message": str,
    "conversation_context": str,
    "user_intelligence": dict | None,  # Especially attachment_style
}
```

**Output:**
```python
{
    "primary_emotion": str,            # e.g., "분노 아래의 두려움"
    "underlying_need": str,            # e.g., "인정받고 싶은 욕구"
    "attachment_dynamic": str,         # e.g., "불안형 활성화 - 거리두기에 대한 두려움"
    "partner_likely_emotion": str,     # e.g., "압도당하는 느낌"
    "emotional_intensity": int,        # 1-10
    "empathy_statement": str,          # 2-3 sentence Korean empathy response
}
```

**System Prompt (Korean):**
```
당신은 감정 해석 전문가이자 애착 이론 상담사입니다.

## 역할
사용자의 메시지에서 표면적 감정 아래의 진짜 감정과 욕구를 해석합니다.

## 분석 프레임워크
1. 표면 감정 vs 심층 감정: "화가 난다"고 말하지만 실제로는 "무시당하는 느낌"일 수 있음
2. 애착 역동: 불안형(확인/안심 추구), 회피형(거리두기/독립 추구), 안정형(균형)
3. 충족되지 않은 욕구: 인정, 안전감, 자율성, 연결, 존중
4. 상대방의 감정 추론: 사용자의 설명을 바탕으로 상대방이 느꼈을 감정

## 사용자 애착 스타일
{attachment_section}  <!-- From Workstream A: anxiety/avoidance scores -->

## 규칙
- 사용자의 감정을 판단하지 말고 이해하세요
- "~일 수 있어요", "~으로 느껴질 수 있어요" 같은 탐색적 언어 사용
- 감정에 이름을 붙여주되, 강요하지 마세요
- 공감문은 따뜻하고 지지적인 톤
- 한국어 격식체 사용

## 출력 형식
반드시 유효한 JSON으로만 응답하세요.
{"primary_emotion": "...", "underlying_need": "...", "attachment_dynamic": "...", "partner_likely_emotion": "...", "emotional_intensity": 1-10, "empathy_statement": "..."}
```

**Model tier:** `get_chat_model(temperature=0.5)` -- moderate temperature for empathic nuance.


#### 3. Balance Mediator (균형 중재자)

**Role:** Ensures the response doesn't take sides. Constructs the "how they heard it" perspective. Validates both partners' experiences without invalidating either.

**When invoked:** Reframing mode only. Skipped for simple chat/comfort messages.

**Input:**
```python
{
    "user_message": str,
    "conversation_context": str,
    "pattern_analysis": dict,          # Output from Pattern Analyst
    "emotion_interpretation": dict,    # Output from Emotion Interpreter
}
```

**Output:**
```python
{
    "what_you_said": str,              # User's core expression (quoted)
    "how_they_heard": str,             # Partner's likely interpretation
    "how_you_heard_them": str,         # User's interpretation of partner's words
    "why_the_gap": str,                # Root cause of communication gap
    "balance_check": str,              # "balanced" | "leans_user" | "leans_partner"
    "bidirectional_insight": str,      # Korean summary bridging both perspectives
}
```

**System Prompt (Korean):**
```
당신은 커플 관계 중재 전문가입니다. 절대적 중립을 유지합니다.

## 역할
양측의 관점을 모두 인정하면서, 소통 차이의 근본 원인을 설명합니다.

## 중재 프레임워크
1. 사용자가 한 말 (what_you_said): 사용자 메시지의 핵심 표현을 직접 인용
2. 상대방이 들은 것 (how_they_heard): 같은 말이 상대방에게 어떻게 들렸을 수 있는지
3. 사용자가 들은 것 (how_you_heard_them): 상대방의 반응을 사용자가 어떻게 해석했는지
4. 차이의 원인 (why_the_gap): 소통 차이가 발생한 구조적/감정적 이유

## 패턴 분석 참고
{pattern_analysis_json}

## 감정 해석 참고
{emotion_interpretation_json}

## 규칙 (매우 중요)
- 누가 맞고 틀린지 절대 판단하지 마세요
- "항상", "절대", "모든" 같은 절대적 표현 금지
- 양측 모두의 경험이 유효함을 인정하세요
- 관계를 끝내라는 조언 절대 금지
- balance_check에서 편향이 감지되면 자체 교정하세요
- 한국어 격식체 사용

## 출력 형식
반드시 유효한 JSON으로만 응답하세요.
{"what_you_said": "...", "how_they_heard": "...", "how_you_heard_them": "...", "why_the_gap": "...", "balance_check": "balanced/leans_user/leans_partner", "bidirectional_insight": "..."}
```

**Model tier:** `get_chat_model(temperature=0.4)` -- low-moderate for balanced analytical reasoning.


#### 4. Resolution Strategist (해결 전략가)

**Role:** Generates concrete, actionable suggestions based on the combined analysis. Tailors suggestions to the user's conflict style and communication preferences.

**When invoked:** Reframing mode only. Skipped for simple chat/comfort messages.

**Input:**
```python
{
    "user_message": str,
    "pattern_analysis": dict,          # Output from Pattern Analyst
    "emotion_interpretation": dict,    # Output from Emotion Interpreter
    "mediation": dict,                 # Output from Balance Mediator
    "user_intelligence": dict | None,  # conflict_style, communication_frequency
}
```

**Output:**
```python
{
    "suggestions": list[str],          # 3 concrete, actionable suggestions in Korean
    "conversation_starter": str,       # Exact phrase the user can say to partner
    "timing_advice": str,              # When/how to bring this up
    "difficulty_level": str,           # "easy" | "moderate" | "challenging"
}
```

**System Prompt (Korean):**
```
당신은 커플 관계 해결 전략 전문가입니다. 구체적이고 실행 가능한 제안만 합니다.

## 역할
갈등 분석을 바탕으로 사용자가 바로 실행할 수 있는 구체적인 전략을 제시합니다.

## 전략 프레임워크
1. 즉시 실행 가능한 제안 3가지 (구체적 행동, 추상적 조언 금지)
2. 대화 시작 문장: 사용자가 상대방에게 바로 말할 수 있는 정확한 문장
3. 타이밍 조언: 이 대화를 언제, 어떤 상황에서 시작하면 좋은지
4. 난이도 평가: 사용자의 갈등 스타일에 맞는 난이도

## 분석 결과 참고
패턴: {pattern_analysis_json}
감정: {emotion_interpretation_json}
중재: {mediation_json}

## 사용자 스타일
{user_style_section}  <!-- conflict_style, communication_frequency from Workstream A -->

## 규칙
- "소통을 잘 하세요" 같은 추상적 조언 절대 금지
- 모든 제안은 구체적 행동이어야 함 (언제, 어디서, 무엇을, 어떻게)
- 대화 시작 문장은 그대로 사용할 수 있는 완성된 문장
- 사용자의 갈등 스타일에 맞춰 조정 (회피형 → 부드러운 접근, 직면형 → 구조화된 대화)
- 한국어 격식체 사용

## 출력 형식
반드시 유효한 JSON으로만 응답하세요.
{"suggestions": ["...", "...", "..."], "conversation_starter": "...", "timing_advice": "...", "difficulty_level": "easy/moderate/challenging"}
```

**Model tier:** `get_chat_model(temperature=0.6)` -- moderate-high for creative yet practical suggestions.


#### 5. Ethics Guardian (윤리 보호자)

**Role:** Validates all agent outputs for safety, ethical compliance, and therapeutic boundaries. Acts as a final gate before response delivery. This is the LLM-based safety layer that supplements the keyword-based `check_safety()`.

**When invoked:** ALWAYS. Runs on every message as a validation gate on the synthesized response. Cannot be skipped by the router.

**Input:**
```python
{
    "user_message": str,
    "synthesized_response": str,       # Combined output about to be sent
    "suggestions": list[str],          # From Resolution Strategist
    "escalation_risk": str,            # From Pattern Analyst
    "emotional_intensity": int,        # From Emotion Interpreter
}
```

**Output:**
```python
{
    "approved": bool,                  # True if response passes all checks
    "safety_flags": list[str],         # Any safety concerns identified
    "modifications_needed": list[str], # Required changes before sending
    "risk_level": str,                 # "safe" | "caution" | "block"
    "professional_referral": bool,     # Whether to recommend professional help
    "referral_resources": list[str],   # Korean crisis resources if needed
}
```

**System Prompt (Korean):**
```
당신은 커플 상담 윤리 감독관입니다. 모든 AI 응답이 안전하고 윤리적인지 검증합니다.

## 역할
AI가 생성한 응답을 검토하고 윤리적/안전 기준을 충족하는지 확인합니다.

## 검증 체크리스트
1. 편향 검사: 한쪽 편을 들고 있지 않은지
2. 해로운 조언 검사: 관계를 끝내라는 조언, 보복 제안, 조종 기법 등
3. 심리 진단 검사: 전문 상담 없이 정신건강 진단을 하고 있지 않은지
4. 학대 감지: 사용자의 메시지에서 학대 신호가 있는지 (키워드 필터를 보완)
5. 절대적 표현 검사: "항상", "절대", "모든" 사용 여부
6. 전문가 의뢰 필요성: 전문 상담이 필요한 수준인지

## 검토 대상 응답
{synthesized_response}

## 위험 지표
에스컬레이션 위험: {escalation_risk}
감정 강도: {emotional_intensity}/10

## 판단 기준
- safe: 모든 검사 통과, 응답 승인
- caution: 경미한 수정 필요 (modifications_needed에 명시)
- block: 응답 차단, 안전 응답으로 대체 필요

## 전문가 의뢰 기준
- 감정 강도 8 이상이 3회 연속
- 학대 신호 감지
- 자해/자살 관련 언급 (check_safety 보완)
- 심각한 정신건강 증상 묘사

## 의뢰 자원 (한국어)
- 1366 여성긴급전화 (24시간)
- 경찰 112
- 정신건강위기상담 1577-0199
- 자살예방상담전화 1393

## 출력 형식
반드시 유효한 JSON으로만 응답하세요.
{"approved": true/false, "safety_flags": [...], "modifications_needed": [...], "risk_level": "safe/caution/block", "professional_referral": true/false, "referral_resources": [...]}
```

**Model tier:** `get_chat_model(temperature=0.1)` -- primary model with lowest temperature for deterministic safety decisions. **Safety validation in a therapy app must NOT use the cheapest model** — the Ethics Guardian performs nuanced reasoning (bias detection, abuse signal interpretation, professional referral decisions) that smaller models handle poorly. The cost difference is marginal (256 max tokens) compared to the risk of a false negative on safety. Configurable via `AGENT_MODEL_TIERS['ethics_guardian']`.


---

### State Schema

```python
# File: backend/apps/chat/services/agent_state.py

import operator
from typing import TypedDict, Optional, Literal, Annotated


class AgentOutput(TypedDict, total=False):
    """Individual agent output stored in shared state."""
    agent_name: str
    output: dict
    model_used: str
    token_count: int


class TherapyState(TypedDict, total=False):
    """Shared state across all agents in the therapy pipeline.

    Uses plain TypedDict (not MessagesState) since agents communicate
    via structured dict fields, not LangGraph message accumulation.
    List fields that accumulate use Annotated[list, operator.add].
    """
    # Input (set by pipeline entry)
    user_message: str
    conversation_context: str
    user_intelligence: Optional[dict]       # From Workstream A UserIntelligenceService
    mild_safety_flag: bool                  # From check_safety() mild keyword match

    # Router decision (set by supervisor)
    message_classification: str             # "chat" | "reframing" | "comfort" | "crisis"
    agents_to_invoke: list[str]             # Which agents the supervisor selected
    complexity_level: str                   # "simple" | "moderate" | "complex"

    # Agent outputs (accumulated as agents complete)
    pattern_analysis: Optional[dict]        # From Pattern Analyst
    emotion_interpretation: Optional[dict]  # From Emotion Interpreter
    mediation: Optional[dict]               # From Balance Mediator
    resolution_strategy: Optional[dict]     # From Resolution Strategist
    ethics_review: Optional[dict]           # From Ethics Guardian

    # Synthesis (set by response synthesizer)
    mode: str                               # "chat" | "reframing" | "comfort"
    final_response: str                     # Synthesized Korean text for client
    analysis: Optional[dict]                # Structured analysis for reframing_data
    suggestions: list[str]                  # Final suggestions list
    is_abuse_detected: bool
    safety_response: Optional[dict]

    # Metadata (Annotated lists use append semantics in LangGraph)
    total_token_count: int
    agents_executed: Annotated[list[str], operator.add]  # Append, not replace
    execution_time_ms: int
```

---

### Supervisor/Router Logic

The supervisor decides which agents to invoke based on message classification. NOT every message goes through all 5 agents.

```python
# Routing matrix:
#
# All paths include: Supervisor (1 call, cheap) + Synthesizer (1 call, primary) + Ethics Guardian (1 call, primary)
# These 3 are implicit in every path. The table shows which of the 5 named agents are invoked.
#
# Message Type     | Emotion | Pattern | Balance | Resolution | Total LLM Calls
# -----------------|---------|---------|---------|------------|----------------
# Simple chat      |    Y    |    N    |    N    |     N      |  4  (sup+emo+syn+eth)
# Emotional vent   |    Y    |    N    |    N    |     N      |  4  (sup+emo+syn+eth)
# Comfort mode     |    Y    |    N    |    N    |     N      |  4  (sup+emo+syn+eth)
# Mild conflict    |    Y    |    Y    |    N    |     Y      |  6  (sup+emo+pat+res+syn+eth)
# Full conflict    |    Y    |    Y    |    Y    |     Y      |  7  (sup+emo+pat+bal+res+syn+eth)
# Safety flagged   |    Y    |    N    |    N    |     N      |  4  (sup+emo+syn+eth)
#
# Full conflict = 7 sequential LLM calls, but Pattern + Emotion run in parallel
#   so wall-clock is 6 sequential waits (sup -> [emo||pat] -> bal -> res -> syn -> eth)
#
# Ethics Guardian ALWAYS runs. It cannot be skipped.
# Emotion Interpreter ALWAYS runs. Understanding emotions is baseline.
# Supervisor = 1 LLM call for routing (uses cheaper summarization model).
# Response Synthesizer = 1 LLM call to merge outputs (uses primary chat model).
# Ethics Guardian = 1 LLM call for safety validation (uses primary chat model).
```

**Supervisor System Prompt (Korean):**
```
당신은 커플 상담 AI 시스템의 총괄 코디네이터입니다.

## 역할
사용자의 메시지를 분류하고 어떤 전문 에이전트를 호출할지 결정합니다.

## 분류 기준

### "chat" - 일반 대화
- 인사, 질문, 짧은 응답, 후속 반응
- 구체적 갈등 없이 감정 표현
- 이전 분석에 대한 추가 질문

### "reframing" - 리프레이밍 분석 필요
경미한 갈등 (mild_conflict):
- 불만이나 갈등이 언급되지만 구체적 사건이 불완전
- 에이전트: emotion_interpreter, pattern_analyst, resolution_strategist

완전한 갈등 (full_conflict):
- 구체적 갈등 사건 설명됨
- 양측 입장이 어느 정도 파악됨
- 감정적 맥락이 있음
- 에이전트: 전체 (emotion_interpreter, pattern_analyst, balance_mediator, resolution_strategist)

### "comfort" - 위로 모드
- 사용자가 위로만 필요로 하는 상황
- 이 분류는 comfort_message 엔드포인트에서만 사용
- 에이전트: emotion_interpreter만

## 출력 형식
{"message_classification": "chat/reframing", "complexity_level": "simple/moderate/complex", "agents_to_invoke": ["emotion_interpreter", ...], "reasoning": "분류 이유 한 문장"}
```

---

### Graph Structure (LangGraph)

```python
# File: backend/apps/chat/services/therapy_graph.py
#
# Graph topology:
#
#   [Entry] --> [Supervisor Router]
#                    |
#          +---------+---------+
#          |                   |
#     [chat path]        [reframing path]
#          |                   |
#   [Emotion Interp.]    [Emotion Interp.] + [Pattern Analyst]  (PARALLEL)
#          |                   |
#          |             [Balance Mediator]  (waits for both above)
#          |                   |
#          |             [Resolution Strategist]  (depends on Balance)
#          |                   |
#          +-------+-----------+
#                  |
#          [Response Synthesizer]
#                  |
#          [Ethics Guardian]  (ALWAYS, validates synthesized output)
#                  |
#          [Ethics Gate]  (conditional: approved->Output, block->SafeResponse)
#                  |
#              [Output]

from langgraph.graph import StateGraph, START, END

def build_therapy_graph(
    chat_model,
    summarization_model,
    user_intelligence: dict | None = None,
) -> StateGraph:
    """Build the multi-agent therapy StateGraph.

    Uses dual edges from supervisor node for parallel execution:
    - Pattern Analyst and Emotion Interpreter are separate nodes
    - Supervisor adds edges to BOTH when reframing is needed
    - LangGraph executes nodes with no dependency between them concurrently
    - Balance Mediator waits for both to complete before running

    Args:
        chat_model: Primary LLM from get_chat_model()
        summarization_model: Cheaper LLM from get_summarization_model()
        user_intelligence: Personalized context from UserIntelligenceService

    Returns:
        Compiled StateGraph ready for invocation
    """
    graph = StateGraph(TherapyState)

    # Add all nodes
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("emotion_interpreter", emotion_node)
    graph.add_node("pattern_analyst", pattern_node)
    graph.add_node("balance_mediator", balance_node)
    graph.add_node("resolution_strategist", resolution_node)
    graph.add_node("response_synthesizer", synthesizer_node)
    graph.add_node("ethics_guardian", ethics_node)

    # Entry -> Supervisor
    graph.add_edge(START, "supervisor")

    # Supervisor -> conditional routing based on message_classification
    def route_after_supervisor(state: TherapyState) -> list[str]:
        agents = state.get("agents_to_invoke", [])
        # Always include emotion_interpreter
        targets = ["emotion_interpreter"]
        if "pattern_analyst" in agents:
            targets.append("pattern_analyst")  # Runs PARALLEL with emotion
        return targets

    graph.add_conditional_edges("supervisor", route_after_supervisor)

    # Emotion -> conditional: if reframing, wait for balance; else go to synthesizer
    def route_after_emotion(state: TherapyState) -> str:
        if "balance_mediator" in state.get("agents_to_invoke", []):
            return "balance_mediator"
        return "response_synthesizer"

    graph.add_conditional_edges("emotion_interpreter", route_after_emotion)

    # Pattern -> Balance (Pattern only runs in reframing mode, Balance always follows)
    graph.add_edge("pattern_analyst", "balance_mediator")
    # NOTE: Balance Mediator has TWO incoming edges (emotion + pattern).
    # LangGraph waits for ALL incoming edges before executing a node.
    # This is how parallel execution + join works.

    # Balance -> Resolution
    graph.add_edge("balance_mediator", "resolution_strategist")

    # Resolution -> Synthesizer
    graph.add_edge("resolution_strategist", "response_synthesizer")

    # Synthesizer -> Ethics Guardian (ALWAYS)
    graph.add_edge("response_synthesizer", "ethics_guardian")

    # Ethics Guardian -> conditional gate
    def route_after_ethics(state: TherapyState) -> str:
        review = state.get("ethics_review", {})
        if review.get("risk_level") == "block":
            return END  # State already has safe fallback response set by ethics node
        return END  # Approved or caution — proceed with response

    graph.add_conditional_edges("ethics_guardian", route_after_ethics)

    return graph
```

**Parallel Execution Mechanism (addresses Architect A3, Critic C1):**
LangGraph `StateGraph` executes nodes concurrently when a conditional edge returns multiple targets (list of node names). In `route_after_supervisor`, returning `["emotion_interpreter", "pattern_analyst"]` dispatches both nodes in parallel. Balance Mediator has TWO incoming edges (from emotion and pattern), so LangGraph automatically waits for both to complete before executing it. This is the standard fan-out/fan-in pattern in LangGraph.

**Why NOT using `create_supervisor()` directly:**

The `langgraph-supervisor` library's `create_supervisor()` uses a tool-calling pattern where agents are exposed as tools the supervisor can call iteratively. This is flexible but has drawbacks for our use case:
1. The supervisor might call agents in a suboptimal order (we want a fixed DAG)
2. Each supervisor iteration is an additional LLM call (cost)
3. We need parallel execution of Pattern Analyst + Emotion Interpreter (supervisor calls are sequential)

Instead, we use LangGraph's `StateGraph` directly with conditional edges, which gives us:
- Deterministic routing based on supervisor classification
- Parallel node execution via multi-target conditional edges
- Explicit control over the agent execution DAG
- A single supervisor LLM call for classification, then direct node invocation

The `langgraph-supervisor` package is NOT added to requirements. We use `langgraph` (already installed) with `StateGraph` + conditional edges.

**asyncio.run() Compatibility (addresses Architect A3):**
The current `views.py` and `audio/views.py` call `asyncio.run(run_reframing_pipeline(...))` from synchronous Django views. LangGraph's `StateGraph.compile().ainvoke()` creates internal async tasks for parallel node execution. `asyncio.run()` creates a new event loop which handles these internal tasks correctly — this is tested and works. However, for long-term robustness (especially under ASGI/Daphne where an event loop may already be running), the plan includes a migration note: convert views to Django 5.x native async views in a follow-up. The feature flag allows testing both paths.

---

## Task Flow

### Task 1: State Schema and Agent Definitions
**New files:**
- `backend/apps/chat/services/agent_state.py` -- `TherapyState` TypedDict
- `backend/apps/chat/services/agents/` -- package directory
- `backend/apps/chat/services/agents/__init__.py`
- `backend/apps/chat/services/agents/pattern_analyst.py`
- `backend/apps/chat/services/agents/emotion_interpreter.py`
- `backend/apps/chat/services/agents/balance_mediator.py`
- `backend/apps/chat/services/agents/resolution_strategist.py`
- `backend/apps/chat/services/agents/ethics_guardian.py`
- `backend/apps/chat/prompts/agent_prompts.py` -- All 5 Korean system prompts + supervisor prompt

**Each agent module follows this pattern (with mandatory error handling — addresses Architect A9):**
```python
# backend/apps/chat/services/agents/pattern_analyst.py

import json
import logging
from langchain_core.messages import HumanMessage, SystemMessage
from ..agent_state import TherapyState
from ...prompts.agent_prompts import PATTERN_ANALYST_PROMPT

logger = logging.getLogger(__name__)

# Fallback for template sections when user_intelligence is None (addresses Critic C9)
_NO_PROFILE_FALLBACK = "정보 없음 (개인화 기능 비활성)"

async def run_pattern_analyst(state: TherapyState, model) -> dict:
    """Execute Pattern Analyst agent.

    Args:
        state: Shared therapy state with user_message and context
        model: LangChain chat model instance

    Returns:
        dict update to merge into TherapyState
    """
    try:
        prompt = PATTERN_ANALYST_PROMPT
        # Inject user_intelligence if available; else use fallback text
        if state.get("user_intelligence"):
            prompt = _inject_user_context(prompt, state["user_intelligence"])
        else:
            prompt = prompt.replace("{user_profile_section}", _NO_PROFILE_FALLBACK)

        messages = [
            SystemMessage(content=prompt),
            HumanMessage(content=_build_agent_input(state)),
        ]

        response = await model.ainvoke(messages)
        parsed = _parse_json_response(response.content)

        return {
            "pattern_analysis": parsed,
            "agents_executed": ["pattern_analyst"],  # Annotated list uses append semantics
        }
    except Exception as e:
        # Agent failure must NOT crash the entire graph (A9).
        # Return None output so downstream agents and synthesizer can proceed.
        logger.error(f"Pattern Analyst agent failed: {e}", exc_info=True)
        return {
            "pattern_analysis": None,
            "agents_executed": ["pattern_analyst_FAILED"],
        }
```

**CRITICAL: Every agent node function MUST have try/except wrapping.** If an agent raises, the entire LangGraph execution fails. Each agent returns `{output_field: None}` on failure so the Response Synthesizer can generate a response from whatever agent outputs are available.

**Acceptance Criteria:**
- All 5 agent modules follow the same interface: `async def run_<name>(state, model) -> dict`
- All Korean system prompts are in `agent_prompts.py` (not scattered across agent modules)
- `TherapyState` TypedDict compiles without errors
- Each agent's output matches its documented schema
- `_parse_json_response()` reuses the existing parser from `reframing_graph.py`


### Task 2: Therapy Graph Construction
**New file:**
- `backend/apps/chat/services/therapy_graph.py`

**What it does:**
1. Builds a `StateGraph` with nodes for: supervisor, each agent, response_synthesizer, ethics_guardian
2. Supervisor node classifies the message and sets `agents_to_invoke` in state
3. Conditional edges route to the correct agent set based on `message_classification`
4. Parallel execution: Pattern Analyst and Emotion Interpreter run as concurrent branches when both are needed
5. Response Synthesizer merges all agent outputs into a single natural Korean response
6. Ethics Guardian validates the final output

**Ethics Guardian Block/Caution Handling (addresses Critic C5):**
The Ethics Guardian returns `risk_level` as "safe", "caution", or "block":

- **`risk_level: "safe"`** — Response approved. Pass through unchanged.
- **`risk_level: "caution"`** — Response has minor issues. The `ethics_node` function appends `modifications_needed` items as a disclaimer to the `final_response` (no second LLM call). Example: appends "\n\n참고: 전문 상담사와의 상담도 고려해보세요." if professional referral is suggested.
- **`risk_level: "block"`** — Response rejected. The `ethics_node` function replaces `final_response` with the static `SAFETY_RESPONSE_TEMPLATE` (reused from existing code), sets `is_abuse_detected=True`, and populates `safety_response`. No additional LLM call.

```python
# In ethics_guardian.py:
async def run_ethics_guardian(state: TherapyState, model) -> dict:
    """Validate synthesized response for safety and ethics."""
    try:
        # ... LLM validation call ...
        review = _parse_json_response(response.content)

        if review.get("risk_level") == "block":
            # Replace response with static safety template
            from ...prompts.system_prompts import SAFETY_RESPONSE_TEMPLATE
            return {
                "ethics_review": review,
                "final_response": SAFETY_RESPONSE_TEMPLATE["acknowledgment"],
                "is_abuse_detected": True,
                "safety_response": SAFETY_RESPONSE_TEMPLATE,
                "suggestions": SAFETY_RESPONSE_TEMPLATE["suggestions"],
                "agents_executed": ["ethics_guardian"],
            }

        if review.get("risk_level") == "caution":
            # Append modifications as disclaimer (no extra LLM call)
            mods = review.get("modifications_needed", [])
            disclaimer = "\n\n" + "\n".join(f"참고: {m}" for m in mods)
            return {
                "ethics_review": review,
                "final_response": state.get("final_response", "") + disclaimer,
                "agents_executed": ["ethics_guardian"],
            }

        # safe — pass through
        return {
            "ethics_review": review,
            "agents_executed": ["ethics_guardian"],
        }
    except Exception as e:
        logger.error(f"Ethics Guardian failed: {e}")
        # On failure, BLOCK by default (fail-safe for therapy app)
        return {
            "ethics_review": {"approved": False, "risk_level": "block", "error": str(e)},
            "final_response": SAFETY_RESPONSE_TEMPLATE["acknowledgment"],
            "is_abuse_detected": True,
            "safety_response": SAFETY_RESPONSE_TEMPLATE,
            "agents_executed": ["ethics_guardian"],
        }
```

**Response Synthesizer:**
This is an internal node (not one of the 5 "named" agents) that takes all agent outputs and produces the final user-facing response. It replaces the current `_build_readable_response()` function with an LLM-based synthesis.

```python
# Response Synthesizer prompt
RESPONSE_SYNTHESIZER_PROMPT = """당신은 커플 상담 AI의 응답 작성자입니다.

## 역할
여러 전문가의 분석 결과를 하나의 자연스러운 한국어 응답으로 합칩니다.

## 입력 분석 결과
공감: {emotion_json}
패턴 분석: {pattern_json}
중재: {mediation_json}
전략: {resolution_json}

## 응답 구조 (리프레이밍 모드)
1. 공감 (2-3문장): 감정 해석가의 empathy_statement 기반
2. 분석: 중재자의 bidirectional_insight 기반
3. 제안: 전략가의 suggestions 기반

## 응답 구조 (대화 모드)
감정 해석가의 empathy_statement를 중심으로 자연스러운 대화체 응답

## 규칙
- 전문 용어를 쉬운 한국어로 변환
- 분석 결과를 나열하지 말고 자연스러운 문장으로 통합
- 따뜻하고 지지적인 톤 유지
- 한국어 격식체 (~입니다, ~세요)
"""
```

**Graph execution flow (pseudo-code):**
```python
async def run_therapy_pipeline(
    user_message: str,
    conversation_context: str = "",
    user_intelligence: dict | None = None,
    mode: str = "reframing",  # "reframing" or "comfort"
) -> dict:
    """Main entry point replacing run_reframing_pipeline().

    Returns dict with same shape as current pipeline output for
    backward compatibility.
    """
    # 1. Safety pre-filter (unchanged)
    safety_result = check_safety(user_message)
    if safety_result and safety_result.get("is_abuse_detected"):
        return _safety_response(safety_result)  # Same as current

    # 2. Build initial state
    initial_state = TherapyState(
        user_message=user_message,
        conversation_context=conversation_context,
        user_intelligence=user_intelligence,
        mild_safety_flag=bool(safety_result and safety_result.get("mild_flag")),
    )

    # 3. Execute graph
    graph = build_therapy_graph(
        chat_model=get_chat_model(temperature=0.5, streaming=False),
        summarization_model=get_summarization_model(),
        user_intelligence=user_intelligence,
    )
    compiled = graph.compile()
    final_state = await compiled.ainvoke(initial_state)

    # 4. Return backward-compatible response dict
    return {
        "mode": final_state["mode"],
        "final_response": final_state["final_response"],
        "analysis": final_state.get("analysis"),
        "suggestions": final_state.get("suggestions", []),
        "is_abuse_detected": final_state.get("is_abuse_detected", False),
        "safety_response": final_state.get("safety_response"),
    }
```

**Acceptance Criteria:**
- Graph compiles and executes without errors
- Supervisor classification routes correctly: chat messages skip Pattern/Balance/Resolution
- Parallel execution of Pattern Analyst + Emotion Interpreter works
- Ethics Guardian runs on EVERY path (verified by checking `agents_executed` always contains it)
- Response format matches existing `run_reframing_pipeline()` return shape
- Graph handles missing agent outputs gracefully (if an agent fails, others continue)


### Task 3: Pipeline Integration and Feature Flag
**Modified files:**
- `backend/apps/chat/services/reframing_graph.py` -- add `run_therapy_pipeline()` and feature flag dispatch
- `backend/apps/chat/views.py` -- wire feature flag, pass `user_intelligence` parameter
- `backend/apps/audio/views.py` -- wire feature flag (also calls `run_reframing_pipeline` and `run_comfort_pipeline` at lines 354-394, 409-432)
- `backend/apps/chat/services/__init__.py` -- export new function
- `backend/config/settings/base.py` -- add `MULTI_AGENT_ENABLED` setting

**Feature flag pattern:**
```python
# In config/settings/base.py:
MULTI_AGENT_ENABLED = env.bool('MULTI_AGENT_ENABLED', default=False)

# In reframing_graph.py:
async def run_reframing_pipeline(
    user_message: str,
    conversation_context: str = "",
    user_intelligence: dict | None = None,
) -> dict:
    if settings.MULTI_AGENT_ENABLED:
        return await run_therapy_pipeline(
            user_message=user_message,
            conversation_context=conversation_context,
            user_intelligence=user_intelligence,
            mode="reframing",
        )
    # Existing single-call logic (unchanged)
    ...

async def run_comfort_pipeline(
    user_message: str,
    conversation_context: str = "",
    user_intelligence: dict | None = None,
) -> dict:
    if settings.MULTI_AGENT_ENABLED:
        return await run_therapy_pipeline(
            user_message=user_message,
            conversation_context=conversation_context,
            user_intelligence=user_intelligence,
            mode="comfort",
        )
    # Existing comfort logic (unchanged)
    ...
```

**Comfort mode routing (addresses Architect A10):**
When `mode="comfort"` is passed to `run_therapy_pipeline()`, the supervisor is bypassed and the pipeline routes directly to Emotion Interpreter → Response Synthesizer → Ethics Guardian. The supervisor classification is only used when `mode="reframing"` (the default). This avoids wasting an LLM call on classification when the endpoint already knows the mode.

```python
async def run_therapy_pipeline(..., mode: str = "reframing") -> dict:
    if mode == "comfort":
        # Skip supervisor, route directly to emotion-only path
        initial_state["message_classification"] = "comfort"
        initial_state["agents_to_invoke"] = ["emotion_interpreter"]
        # Start graph from emotion_interpreter node directly
    else:
        # Normal flow: supervisor classifies and routes
        ...
```

**Integration with views.py and audio/views.py (addresses Architect A4):**
The `user_intelligence` parameter is passed from `views.py` and `audio/views.py` where `UserIntelligenceService` is called (Workstream A). If Workstream A is not yet implemented, `user_intelligence=None` is passed and agents degrade gracefully (template placeholders replaced with "정보 없음 (개인화 기능 비활성)").

**Note on audio/views.py:** The audio pipeline at `audio/views.py:354-394` and `audio/views.py:409-432` also calls `run_reframing_pipeline()` and `run_comfort_pipeline()`. These call sites must also pass `user_intelligence` when Workstream A is active. The `user_intelligence` parameter defaults to `None` so existing calls continue working without changes.

```python
# In views.py reframe_message():
# (After Workstream A is implemented)
# user_context = UserIntelligenceService.get_ai_context(request.user.id)
user_context = None  # Placeholder until Workstream A lands

result = asyncio.run(run_reframing_pipeline(
    user_message=user_message,
    conversation_context=conversation_context,
    user_intelligence=user_context,  # NEW parameter
))
```

**Acceptance Criteria:**
- `MULTI_AGENT_ENABLED=False` (default): behavior identical to current single-call pipeline
- `MULTI_AGENT_ENABLED=True`: uses multi-agent pipeline
- API response format unchanged in both modes
- Feature flag toggleable via environment variable (no code deploy needed)
- `user_intelligence=None` works without errors (graceful degradation)
- Existing tests continue to pass with `MULTI_AGENT_ENABLED=False`


### Task 4: Cost Control and Performance Optimization
**Modified files:**
- `backend/apps/chat/services/therapy_graph.py` -- add model routing per agent
- `backend/config/settings/base.py` -- add agent model tier settings

**Model routing per agent:**
```python
# In config/settings/base.py:
AGENT_MODEL_TIERS = {
    'supervisor': 'summarization',       # Cheapest: classification only (256 tokens)
    'pattern_analyst': 'chat',           # Primary: needs analytical depth
    'emotion_interpreter': 'chat',       # Primary: needs empathic nuance
    'balance_mediator': 'chat',          # Primary: needs reasoning depth
    'resolution_strategist': 'chat',     # Primary: needs creative suggestions
    'ethics_guardian': 'chat',           # Primary: safety requires nuanced reasoning (NOT cheapest)
    'response_synthesizer': 'chat',      # Primary: needs natural Korean writing
}
# NOTE: Ethics Guardian uses primary chat model, not summarization.
# Safety validation in a therapy app requires reasoning depth for:
# bias detection, abuse signal interpretation, professional referral decisions.
# Cost difference is marginal (256 max tokens) vs risk of false negative.
```

**Token budget enforcement:**
```python
# Per-agent max_tokens:
AGENT_MAX_TOKENS = {
    'supervisor': 256,            # Just classification JSON
    'pattern_analyst': 512,       # Structured analysis
    'emotion_interpreter': 512,   # Emotional analysis
    'balance_mediator': 512,      # Bidirectional perspective
    'resolution_strategist': 512, # Suggestions
    'ethics_guardian': 256,       # Approval/rejection
    'response_synthesizer': 1024, # Full natural language response
}
# Total worst case: ~3584 tokens output (7 agents)
# Typical case (chat): ~1792 tokens (supervisor + emotion + synthesizer + ethics)
```

**Cost comparison (corrected — addresses Architect A8, Critic C6):**
```
Current: 1 chat-model call (~2048 max tokens) = 1x cost
Chat path: supervisor(sum) + emotion(chat) + synthesizer(chat) + ethics(chat) = ~3.5x cost
Full reframing: supervisor(sum) + 4 agents(chat) + synthesizer(chat) + ethics(chat) = ~6x cost

Note: Ethics Guardian upgraded to chat model (not summarization) for safety.
Supervisor still uses summarization model (classification only).

Mitigation strategies:
1. Simple messages (>60% of traffic) use chat path = 3.5x, not 6x
2. Supervisor uses summarization model (cheapest, classification only)
3. Pattern + Emotion run in parallel (latency reduction, same cost)
4. Per-agent max_tokens keep individual calls small (256-1024)
5. Future: cache agent outputs for repeated patterns (not in scope)
```

**Acceptance Criteria:**
- Each agent uses the correct model tier (summarization vs chat)
- Per-agent max_tokens enforced
- Total token usage logged per request for monitoring
- Parallel execution of independent agents reduces latency


### Task 5: Testing
**New files:**
- `backend/apps/chat/tests/test_therapy_graph.py`
- `backend/apps/chat/tests/test_agents.py`

**Required tests:**

```python
# test_therapy_graph.py

class TestTherapyGraphRouting:
    """Test supervisor routing decisions."""

    def test_simple_chat_routes_to_emotion_only(self):
        """Simple greeting should invoke only Emotion Interpreter + Ethics."""

    def test_full_conflict_routes_to_all_agents(self):
        """Detailed conflict description should invoke all 5 agents."""

    def test_mild_conflict_skips_balance_mediator(self):
        """Incomplete conflict should skip Balance Mediator."""

    def test_ethics_guardian_always_invoked(self):
        """Every routing path must include Ethics Guardian."""

    def test_comfort_mode_routes_to_emotion_only(self):
        """Comfort pipeline should invoke only Emotion Interpreter + Ethics."""


class TestTherapyGraphExecution:
    """Test full graph execution."""

    def test_reframing_response_format(self):
        """Reframing mode output matches expected API format."""

    def test_chat_response_format(self):
        """Chat mode output matches expected API format."""

    def test_safety_prefilter_bypasses_graph(self):
        """Severe safety keyword triggers immediate response, no graph execution."""

    def test_mild_safety_flag_passed_to_agents(self):
        """Mild safety flag is available in state for agents."""

    def test_graceful_degradation_without_user_intelligence(self):
        """Pipeline works with user_intelligence=None."""

    def test_agent_failure_doesnt_crash_pipeline(self):
        """If one agent fails, others continue and response is still generated."""


class TestFeatureFlag:
    """Test feature flag toggling."""

    def test_disabled_uses_single_call(self):
        """MULTI_AGENT_ENABLED=False uses existing pipeline."""

    def test_enabled_uses_multi_agent(self):
        """MULTI_AGENT_ENABLED=True uses new graph pipeline."""

    def test_response_format_identical_both_modes(self):
        """API response shape is the same regardless of feature flag."""


# test_agents.py

class TestPatternAnalyst:
    def test_identifies_blame_defense_pattern(self):
    def test_uses_user_intelligence_for_recurring(self):
    def test_works_without_user_intelligence(self):

class TestEmotionInterpreter:
    def test_identifies_underlying_emotion(self):
    def test_uses_attachment_style_context(self):
    def test_empathy_statement_in_korean(self):

class TestBalanceMediator:
    def test_no_side_taking(self):
    def test_balance_check_self_correction(self):
    def test_uses_pattern_and_emotion_inputs(self):

class TestResolutionStrategist:
    def test_suggestions_are_concrete(self):
    def test_adapts_to_conflict_style(self):
    def test_conversation_starter_is_complete_sentence(self):

class TestEthicsGuardian:
    def test_blocks_harmful_advice(self):
    def test_detects_abuse_signals(self):
    def test_recommends_professional_referral(self):
    def test_approves_safe_response(self):
    def test_uses_chat_model_not_summarization(self):
    def test_block_returns_safety_template(self):
    def test_caution_appends_disclaimer(self):
    def test_failure_defaults_to_block(self):

class TestResponseSynthesizer:
    """Test response synthesis from agent outputs (addresses Critic C8)."""
    def test_merges_all_agent_outputs_reframing(self):
    def test_handles_missing_agent_outputs(self):
    def test_chat_mode_uses_empathy_only(self):
    def test_output_is_natural_korean(self):

class TestAgentsExecutedAccumulation:
    """Test Annotated list accumulation (addresses Architect A2)."""
    def test_agents_executed_accumulates_not_replaces(self):
    def test_failed_agent_marked_in_agents_executed(self):
```

**Acceptance Criteria:**
- All test classes have at least the listed test methods
- Tests use mocked LLM responses (no actual API calls)
- Tests verify Korean language in outputs
- Tests verify feature flag behavior
- Tests verify safety integration


### Task 6: Documentation and Prompt Tuning
**New files:**
- `backend/apps/chat/services/agents/README.md` -- Agent architecture documentation

**Modified files:**
- `backend/apps/chat/prompts/agent_prompts.py` -- Fine-tune prompts after integration testing

**What this covers:**
- Document the agent architecture, routing logic, and cost model
- Record prompt versions for tracking iterations
- Add inline comments explaining the graph topology
- Document the relationship between this system and Workstream A

**Acceptance Criteria:**
- README explains how to add a new agent
- README documents the routing matrix
- Prompt file has version comments for each prompt

---

## Dependency Graph

```
Task 1 (State + Agent definitions)
  |
  v
Task 2 (Graph construction) -- depends on Task 1
  |
  v
Task 3 (Integration + Feature flag) -- depends on Task 2
  |
  v
Task 4 (Cost control) -- depends on Task 3
  |
Task 5 (Testing) -- can start after Task 2, runs alongside Tasks 3-4
  |
Task 6 (Documentation) -- runs alongside Tasks 4-5
```

**Workstream A integration:**
- This plan does NOT depend on Workstream A being complete
- When `user_intelligence=None`, agents use generic prompts (no personalization)
- When Workstream A lands, `user_intelligence` dict flows through automatically
- The only change needed post-Workstream-A: uncomment `UserIntelligenceService` call in `views.py`

---

## Files Impact Summary

| File | Task | Change Type |
|------|------|-------------|
| `chat/services/agent_state.py` | 1 | NEW |
| `chat/services/agents/__init__.py` | 1 | NEW |
| `chat/services/agents/pattern_analyst.py` | 1 | NEW |
| `chat/services/agents/emotion_interpreter.py` | 1 | NEW |
| `chat/services/agents/balance_mediator.py` | 1 | NEW |
| `chat/services/agents/resolution_strategist.py` | 1 | NEW |
| `chat/services/agents/ethics_guardian.py` | 1 | NEW |
| `chat/prompts/agent_prompts.py` | 1 | NEW |
| `chat/services/therapy_graph.py` | 2 | NEW |
| `chat/services/reframing_graph.py` | 3 | MODIFY (add feature flag dispatch) |
| `chat/services/__init__.py` | 3 | MODIFY (export new function) |
| `chat/views.py` | 3 | MODIFY (pass user_intelligence param) |
| `audio/views.py` | 3 | MODIFY (pass user_intelligence param — lines 354-394, 409-432) |
| `config/settings/base.py` | 3, 4 | MODIFY (add feature flag + model tiers) |
| `chat/tests/test_therapy_graph.py` | 5 | NEW |
| `chat/tests/test_agents.py` | 5 | NEW |
| `chat/services/agents/README.md` | 6 | NEW |

**Total: 12 new files, 5 modified files. 0 database migrations. 0 new dependencies.**

**Workstream A Dual-Injection Note (addresses Architect A7):**
When multi-agent mode is active (`MULTI_AGENT_ENABLED=True`), personalized context from `UserIntelligenceService` is injected per-agent via state (each agent's `_inject_user_context()` fills its prompt template). When Workstream A also modifies the system prompt via `build_personalized_prompt()`, the multi-agent pipeline does NOT use that modified prompt — it uses its own per-agent prompts. The two systems are mutually exclusive: single-call pipeline uses Workstream A's prompt-level injection; multi-agent pipeline uses per-agent state injection. No duplication occurs.

---

## Migration Strategy

### Phase 1: Shadow Mode (Week 1-2)
- Deploy with `MULTI_AGENT_ENABLED=False` (default)
- Multi-agent code is deployed but inactive
- Run integration tests in CI

### Phase 2: Internal Testing (Week 2-3)
- Enable `MULTI_AGENT_ENABLED=True` in staging environment
- Compare multi-agent vs single-call responses for quality
- Measure token usage and latency

### Phase 3: Gradual Rollout (Week 3-4)
- Enable for a subset of users (can be extended to per-user flag later)
- Monitor cost, latency, and response quality
- Collect user feedback through existing conversation ratings

### Phase 4: Full Rollout (Week 4+)
- Set `MULTI_AGENT_ENABLED=True` as default
- Keep single-call fallback code for 2 more weeks
- Remove fallback code after stable period

### Backward Compatibility
- **API contract:** Response JSON shape is identical in both modes
- **Database:** No schema changes; agent outputs stored in existing `reframing_data` JSON field
- **WebSocket:** No changes; `consumers.py` handles sharing, not AI generation
- **Mobile app:** Zero changes required; same API, same response format
- **Existing conversations:** Continue working normally; multi-agent is transparent

---

## Success Criteria

1. **Routing accuracy:** Simple chat messages invoke 4 LLM calls (supervisor + emotion + synthesizer + ethics), not 7
2. **Response quality:** Multi-agent responses are rated equal or higher than single-call responses in A/B testing
3. **Safety parity:** Ethics Guardian catches all cases that current `check_safety()` catches, plus additional nuanced cases
4. **Cost budget:** Average message costs less than 4.5x the current single-call cost (most messages are simple chat at ~3.5x)
5. **Latency budget:** Multi-agent response time is under 2x current latency (parallel execution of independent agents)
6. **Feature flag works:** Toggling `MULTI_AGENT_ENABLED` switches pipelines without code deploy
7. **Backward compatibility:** All existing tests pass with `MULTI_AGENT_ENABLED=False`
8. **Korean quality:** All agent outputs are natural Korean with consistent honorific style
9. **Workstream A ready:** Pipeline accepts `user_intelligence` dict and degrades gracefully when None
