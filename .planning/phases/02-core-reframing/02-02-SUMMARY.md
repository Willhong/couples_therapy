---
phase: 02-core-reframing
plan: 02
subsystem: api
tags: [langchain, llm, reframing, two-mode, safety-filter, single-call]

# Dependency graph
requires:
  - phase: 02-01
    provides: Chat models (Conversation, Message, ConversationSummary)
provides:
  - Two-mode single-call reframing pipeline (chat + reframing)
  - Keyword-based safety pre-filter (0 LLM calls for severe abuse)
  - Mode-aware HTTP endpoint returning chat or reframing responses
affects: [02-03, 02-04, 02-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-mode LLM single-call, keyword safety pre-filter, mode-aware API response]

key-files:
  modified:
    - backend/apps/chat/services/reframing_graph.py
    - backend/apps/chat/prompts/system_prompts.py
    - backend/apps/chat/prompts/__init__.py
    - backend/apps/chat/services/__init__.py
    - backend/apps/chat/views.py
    - backend/apps/chat/urls.py
    - mobile/src/features/chat/hooks/useStreamingResponse.ts

key-decisions:
  - "Two-mode single-call architecture replacing 5-node LangGraph StateGraph"
  - "LLM decides between chat and reframing modes based on input completeness"
  - "Keyword-based safety pre-filter instead of LLM safety check call"
  - "Severe abuse gets instant static response (0 LLM calls)"
  - "Mild abuse flagged but still processed by LLM (1 call)"
  - "Mode field in API response for frontend routing"

patterns-established:
  - "Two-mode LLM response: LLM chooses output format based on input completeness"
  - "Keyword safety pre-filter: severe=instant response, mild=flag+continue, none=normal"
  - "Mode-aware API: same endpoint returns different response shapes"
  - "_build_readable_response() converts structured JSON to natural text for chat bubble"

# Metrics
duration: 22min
completed: 2026-02-02
---

# Phase 2 Plan 2: Two-Mode Reframing Pipeline Summary (Re-execution)

**Replaced 5-call LangGraph StateGraph with two-mode single-call pipeline: LLM chooses chat (conversational empathy) or reframing (structured analysis) per message, with keyword-based safety pre-filter**

## Performance

- **Duration:** 22 min
- **Started:** 2026-02-01T17:18:23Z
- **Completed:** 2026-02-01T17:40:52Z
- **Tasks:** 2/2
- **Files modified:** 7

## Accomplishments

- Rewrote reframing_graph.py: replaced 5-node LangGraph StateGraph (safety_check -> acknowledge -> analyze -> suggest -> combine) with single async `run_reframing_pipeline()` function making exactly 1 LLM call
- Created TWO_MODE_SYSTEM_PROMPT: single prompt instructing LLM to choose between chat mode (conversational empathy/questions) and reframing mode (structured bidirectional analysis)
- Implemented keyword-based safety pre-filter: SAFETY_KEYWORDS dict with severe/mild categories, SAFETY_RESPONSE_TEMPLATE for instant abuse response (0 LLM calls)
- Updated reframe_message view to handle both modes: chat mode saves `has_reframing=False`, reframing mode saves `has_reframing=True` with structured data
- API response includes `mode` field for frontend routing: chat returns `{mode: 'chat', message: '...'}`, reframing returns `{mode: 'reframing', final_response: '...', analysis: {...}}`
- Removed all dead SSE code: stream_reframe view, _generate_sse_stream, _sync_sse_generator, stream-reframe URL route
- Updated frontend useStreamingResponse.ts to handle both mode responses

## Task Commits

1. **Task 1: Two-mode system prompt, safety filter, and pipeline rewrite** - `3110811` (feat)
2. **Task 2: Update views, URLs, and frontend hooks** - `816491b` (feat)

## Files Modified

- `backend/apps/chat/services/reframing_graph.py` - Replaced LangGraph with two-mode single-call pipeline
- `backend/apps/chat/prompts/system_prompts.py` - New TWO_MODE_SYSTEM_PROMPT, SAFETY_KEYWORDS, SAFETY_RESPONSE_TEMPLATE; removed old node prompts
- `backend/apps/chat/prompts/__init__.py` - Updated exports for new prompt symbols
- `backend/apps/chat/services/__init__.py` - Updated exports (removed reframing_graph, ReframingState, stream_reframing_pipeline)
- `backend/apps/chat/views.py` - Mode-aware reframe_message, removed SSE code
- `backend/apps/chat/urls.py` - Removed stream-reframe route
- `mobile/src/features/chat/hooks/useStreamingResponse.ts` - Handle mode field in response

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Two-mode single-call over multi-node graph | 5x fewer LLM calls; LLM is smart enough to choose mode from single prompt |
| Keyword pre-filter over LLM safety check | Saves 1 LLM call; severe abuse keywords are unambiguous in Korean |
| Static safety response template | Severe abuse needs immediate, reliable response (not LLM-generated) |
| Mild abuse continues to LLM | Mild keywords like "무시" may have non-abuse contexts; LLM handles nuance |
| Mode field in API response | Frontend can render chat messages as plain bubbles vs reframing with analysis button |
| Removed SSE entirely | React Native fetch doesn't support ReadableStream; regular HTTP was already in use |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated prompts/__init__.py**
- **Found during:** Task 1 verification
- **Issue:** `__init__.py` imported old prompt names (ACKNOWLEDGE_PROMPT, etc.) that no longer exist
- **Fix:** Updated exports to TWO_MODE_SYSTEM_PROMPT, SAFETY_RESPONSE_TEMPLATE, SAFETY_KEYWORDS
- **Files modified:** `backend/apps/chat/prompts/__init__.py`
- **Commit:** `3110811`

**2. [Rule 3 - Blocking] Updated services/__init__.py**
- **Found during:** Task 1 verification
- **Issue:** `__init__.py` imported removed symbols (reframing_graph, ReframingState, stream_reframing_pipeline)
- **Fix:** Updated exports to run_reframing_pipeline, run_reframing_pipeline_sync, check_safety
- **Files modified:** `backend/apps/chat/services/__init__.py`
- **Commit:** `3110811`

**3. [Rule 1 - Bug] Fixed docstring referencing removed endpoint**
- **Found during:** Task 2 verification
- **Issue:** `save_reframing` docstring referenced removed `stream_reframe` endpoint
- **Fix:** Updated docstring to remove dead reference
- **Files modified:** `backend/apps/chat/views.py`
- **Commit:** `816491b`

## Issues Encountered

None beyond the blocking issues noted above (all auto-fixed).

## Next Phase Readiness

- Two-mode pipeline ready for production use
- Chat mode enables natural conversational flow before full reframing
- Reframing mode produces backward-compatible JSON for ReframingModal
- Frontend MessageBubble already handles both: shows "관점 분석 보기" button only when reframingData exists
- context_manager.py completely untouched (SUMMARIZATION_PROMPT unchanged)
- LLM service layer completely untouched (get_chat_model() interface stable)

**Ready for:** Phase 3 (Audio Pipeline), Phase 4 (Partner & Engagement)

---
*Phase: 02-core-reframing*
*Plan: 02 (re-executed)*
*Completed: 2026-02-02*
