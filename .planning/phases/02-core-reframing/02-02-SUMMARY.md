---
phase: 02-core-reframing
plan: 02
subsystem: api
tags: [langchain, langgraph, llm, streaming, sse, reframing]

# Dependency graph
requires:
  - phase: 02-01
    provides: Chat models (Conversation, Message, ConversationSummary)
provides:
  - LangChain LLM service with provider abstraction (OpenAI, Anthropic, Google)
  - LangGraph reframing pipeline with safety detection
  - Context manager with rolling summarization
  - Streaming HTTP endpoints for reframing
affects: [02-03, 02-04, 02-05]

# Tech tracking
tech-stack:
  added: [langchain, langchain-core, langgraph, langchain-openai, langchain-anthropic, langchain-google-genai, django-environ]
  patterns: [LangGraph StateGraph workflow, SSE streaming, rolling summarization]

key-files:
  created:
    - backend/apps/chat/services/llm_service.py
    - backend/apps/chat/services/reframing_graph.py
    - backend/apps/chat/services/context_manager.py
    - backend/apps/chat/prompts/system_prompts.py
  modified:
    - backend/requirements.txt
    - backend/config/settings/base.py
    - backend/apps/chat/views.py
    - backend/apps/chat/urls.py

key-decisions:
  - "LangChain for unified LLM interface with provider abstraction"
  - "LangGraph StateGraph for modular reframing pipeline"
  - "Safety check routing for abuse detection (severe vs mild handling)"
  - "Rolling summarization with 10 recent messages verbatim"
  - "SSE streaming with status updates per pipeline node"

patterns-established:
  - "LLM provider factory pattern via get_chat_model()"
  - "StateGraph workflow: safety_check -> acknowledge -> analyze -> suggest -> combine"
  - "Conditional routing for abuse detection (severe cases bypass normal flow)"
  - "Context manager with automatic summarization trigger at 20+ messages"

# Metrics
duration: 10min
completed: 2026-01-23
---

# Phase 2 Plan 2: LangChain + LangGraph Integration Summary

**LangGraph-based reframing pipeline with safety detection, LangChain provider abstraction (OpenAI/Anthropic/Google), rolling context summarization, and SSE streaming endpoints**

## Performance

- **Duration:** 10 min
- **Started:** 2026-01-23T14:57:34Z
- **Completed:** 2026-01-23T15:07:06Z
- **Tasks:** 6
- **Files modified:** 9

## Accomplishments

- LangGraph pipeline: safety_check -> [abuse: safety_response | normal: acknowledge -> analyze -> suggest] -> combine
- LangChain LLM service with switchable providers (OpenAI, Anthropic, Google) via LLM_PROVIDER env var
- Node-specific prompts enforcing non-judgmental, coach-like communication
- Rolling context summarization keeping last 10 messages verbatim
- SSE streaming endpoint with AI thinking status updates per node

## Task Commits

Each task was committed atomically:

1. **Task 1: Add LangChain and LangGraph dependencies** - `295c951` (chore)
2. **Task 2: Create system prompts for graph nodes** - `ad729fd` (feat)
3. **Task 3: Create LangChain LLM service** - `4dca2c9` (feat)
4. **Task 4: Create LangGraph reframing pipeline** - `0aa1524` (feat)
5. **Task 5: Create context manager** - `6d21977` (feat)
6. **Task 6: Create streaming HTTP endpoints** - `52f9bd3` (feat)

**Services exports update:** `a2693f8` (chore: update services __init__.py exports)

## Files Created/Modified

- `backend/requirements.txt` - Added LangChain, LangGraph, provider packages, django-environ
- `backend/config/settings/base.py` - Added LLM configuration (provider, models, parameters)
- `backend/apps/chat/prompts/__init__.py` - Prompts package exports
- `backend/apps/chat/prompts/system_prompts.py` - Node-specific prompts (acknowledge, analyze, suggest, safety)
- `backend/apps/chat/services/__init__.py` - Services package exports
- `backend/apps/chat/services/llm_service.py` - LangChain LLM factory with provider abstraction
- `backend/apps/chat/services/reframing_graph.py` - LangGraph StateGraph reframing pipeline
- `backend/apps/chat/services/context_manager.py` - Rolling conversation summarization
- `backend/apps/chat/views.py` - Added llm_info, reframe_message, stream_reframe endpoints
- `backend/apps/chat/urls.py` - Added routes for new endpoints

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| LangChain over raw APIs | Unified interface enables provider switching without code changes |
| LangGraph StateGraph | Modular pipeline with conditional routing for safety handling |
| Safety check first | All messages pass through abuse detection before processing |
| Severe vs mild abuse routing | Severe cases get safety resources, mild cases get normal reframing + gentle flag |
| 10 recent messages verbatim | Balance between context preservation and token cost |
| SSE over WebSocket for streaming | One-way streaming simpler than bidirectional; WebSocket already used for real-time partner notifications |
| Sync wrapper for async pipeline | DRF doesn't natively support async views in this context |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **LangChain import path changes:** LangChain 1.2.x has different imports than older versions; used `langchain_core` for base types
- **Async/sync mixing:** DRF views are sync but LangGraph is async; created sync wrapper using `asyncio.new_event_loop()`

## User Setup Required

**External services require manual configuration:**

1. Set one of the following API keys based on your chosen provider:
   - `OPENAI_API_KEY` - From OpenAI Platform API Keys
   - `ANTHROPIC_API_KEY` - From Anthropic Console API Keys
   - `GOOGLE_API_KEY` - From Google AI Studio API Keys

2. Optionally set `LLM_PROVIDER` environment variable:
   - `openai` (default)
   - `anthropic`
   - `google`

3. Verify with: `GET /api/v1/chat/llm-info/`

## Next Phase Readiness

- LangGraph pipeline ready for frontend integration (Plan 02-04)
- Streaming endpoint ready for real-time chat UI
- Context manager will auto-summarize when conversations exceed 20 messages
- Safety detection in place for abuse patterns

**Ready for:** Mobile chat interface (02-04), reframing modal (02-05)

---
*Phase: 02-core-reframing*
*Plan: 02*
*Completed: 2026-01-23*
