# Phase 5: Foundation & Stack - Research

**Researched:** 2026-02-13
**Domain:** Django/LangGraph integration fixes, async/sync patterns, dependency modernization
**Confidence:** HIGH

## Summary

Phase 5 addresses four critical integration gaps preventing the analysis pipeline from executing end-to-end, plus two dependency modernization requirements. The codebase investigation reveals concrete, well-scoped problems: (1) analysis agent nodes use `async def` + `state['model_factory']` signatures but the analysis graph wrapper calls them with `sync (state, model)` -- they will crash at runtime; (2) event triggers (`on_conversation_ended`, `on_checkin_submitted`) exist as Celery tasks but are never called from any view or consumer; (3) `asyncio.run()` in Django views will raise `RuntimeError: This event loop is already running` under Daphne/ASGI; (4) `chat_graph.py` compiles eagerly at module level, which can fail at import time. There is also a name mismatch bug: `analysis_graph.py` imports `EthicsBlockError` but `ethics_guardian.py` defines `EthicsReviewFailed`.

All problems are deterministic and can be verified mechanically (import test, graph.invoke test, view integration test). The dependency delta is small -- most packages are already at or near target versions.

**Primary recommendation:** Fix the five agent signatures first (FNDX-01), then wire triggers (FNDX-02), then fix asyncio (FNDX-03), then lazy-compile chat_graph (FNDX-04), then write the end-to-end test (FNDX-05), then bump dependencies (STAK-01/02). This order lets each fix be tested incrementally.

## Standard Stack

### Core (Already Installed -- Fix & Upgrade)

| Library | Current | Target | Purpose | Action |
|---------|---------|--------|---------|--------|
| langgraph | 1.0.7 | 1.0.8+ | StateGraph orchestration | Upgrade (minor patch) |
| langchain-core | 1.2.7 | 1.2.11+ | LLM abstractions | Upgrade (minor patch) |
| langchain | 1.2.6 | 1.2.7+ | LangChain framework | Upgrade |
| langchain-openai | 1.1.7 | latest | OpenAI provider | Upgrade |
| langchain-anthropic | 1.3.1 | latest | Anthropic provider | Upgrade |
| langchain-google-genai | 4.2.0 | latest | Google provider | Upgrade |
| psycopg[binary] | 3.3.2 | 3.3.2 | PostgreSQL adapter | Already at target |
| Django | 5.2.10 | 5.2.x | Web framework | Keep (LTS) |
| daphne | 4.2.1 | 4.2.x | ASGI server | Keep |
| celery | 5.6.2 | 5.6.x | Task queue | Keep |
| channels | 4.3.2 | 4.3.x | WebSocket | Keep |

### Supporting (No Changes Needed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| redis | 7.1.0 | Broker/cache | Current |
| channels-redis | 4.3.0 | Channel layer | Current |
| django-celery-beat | 2.8.1 | Periodic tasks | Current |
| asgiref | (bundled) | ASGI utilities | Bundled with Django |

### Mobile (Verify Compatibility)

| Library | Current | Purpose | Action |
|---------|---------|---------|--------|
| expo | ~54.0.33 | App framework | Already latest SDK 54 |
| react-native | ^0.81.5 | Mobile runtime | Compatible with Expo 54 |
| react | 19.1.0 | UI framework | Compatible with RN 0.81 |

**Installation (backend upgrade):**
```bash
cd backend
uv pip install "langgraph>=1.0.8" "langchain-core>=1.2.11" "langchain>=1.2.7" "langchain-openai>=1.1.7" "langchain-anthropic>=1.3.1" "langchain-google-genai>=4.2.0"
```

## Architecture Patterns

### Current Project Structure (Intelligence Module)
```
backend/apps/intelligence/
├── models.py                    # InsightReport model
├── tasks.py                     # Celery tasks (triggers + dispatch)
├── views.py                     # API endpoints (reports)
├── services/
│   ├── analysis_graph.py        # LangGraph StateGraph orchestration
│   ├── data_collector.py        # TherapyDataCollector (9 data sources)
│   ├── trigger_service.py       # 4-tier trigger evaluation
│   └── agents/
│       ├── pattern_analyst.py   # BUG: async, wrong signature
│       ├── emotion_interpreter.py  # BUG: async, wrong signature
│       ├── balance_mediator.py  # BUG: async, wrong signature
│       ├── resolution_strategist.py # BUG: async, wrong signature
│       ├── report_synthesizer.py # BUG: async, wrong signature + wrong output key
│       └── ethics_guardian.py   # BUG: async, wrong signature + wrong exception name
```

### Pattern 1: Sync Node with Model Parameter (Target Pattern for FNDX-01)

**What:** All analysis agent nodes must be synchronous functions accepting `(state: AnalysisState, model: BaseChatModel) -> dict`
**When to use:** Every LangGraph node that makes LLM calls in the analysis pipeline
**Why:** The analysis graph runs via `graph.invoke()` (sync) inside a Celery task. LangGraph sync invoke does not support async nodes.

**Current broken pattern (ALL 6 agents):**
```python
# BROKEN: async def, accesses state['model_factory']
async def pattern_node(state: dict) -> dict:
    model = state['model_factory']('pattern_analyst')
    response = await model.ainvoke(messages)
    state['pattern_analysis'] = result
    return state  # Mutates state directly
```

**Target fixed pattern:**
```python
# FIXED: sync def, accepts (state, model), returns dict update
def pattern_node(state: AnalysisState, model) -> dict:
    response = model.invoke(messages)
    return {'pattern_analysis': result}  # Returns partial update
```

**Key changes per agent:**
1. `async def` -> `def`
2. Remove `state['model_factory']` access -- model is passed as parameter
3. `await model.ainvoke()` -> `model.invoke()`
4. Return partial dict update, not mutated full state

Source: LangGraph official docs show all node functions as `def node(state) -> dict` returning partial state updates.

### Pattern 2: Lazy Graph Compilation (FNDX-04)

**What:** Defer `StateGraph.compile()` until first use instead of at module import time
**When to use:** Any graph that imports Django models or other heavy dependencies

**Current broken pattern (chat_graph.py line 251):**
```python
# BROKEN: compiles at import time, may fail if Django not ready
_compiled_graph = _build_graph().compile()
```

**Target pattern (already done correctly in analysis_graph.py):**
```python
# CORRECT: lazy compilation
_compiled_graph = None

def _get_compiled_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = _build_graph().compile()
    return _compiled_graph
```

Source: Already implemented in `analysis_graph.py` lines 242-249. Apply same pattern to `chat_graph.py`.

### Pattern 3: Replacing asyncio.run() Under ASGI (FNDX-03)

**What:** Replace `asyncio.run()` calls with async views or `asgiref.sync.async_to_sync`
**When to use:** Any Django view that calls async pipeline functions while running under Daphne

**Current broken pattern (chat/views.py lines 334, 623; audio/views.py lines 380, 434):**
```python
# BROKEN under Daphne: "RuntimeError: This event loop is already running"
result = asyncio.run(run_reframing_pipeline(...))
```

**Option A -- Make the view async (Preferred for Django 5.2+):**
```python
# Django 5.2 natively supports async views
@api_view(['POST'])
@permission_classes([IsAuthenticated])
async def reframe_message(request):
    result = await run_reframing_pipeline(...)
```

**Option B -- Use asgiref.sync.async_to_sync:**
```python
from asgiref.sync import async_to_sync

result = async_to_sync(run_reframing_pipeline)(
    user_message=user_message,
    conversation_context=conversation_context,
)
```

**Recommendation:** Use `async_to_sync` (Option B). It is simpler, does not require converting the entire view to async, and `asgiref` is already bundled with Django. DRF `@api_view` does not natively support async in all versions, so making views fully async may require extra work with `adrf` or manual async view classes.

Source: [Django async docs](https://django.readthedocs.io/en/stable/topics/async.html), [asgiref GitHub](https://github.com/django/asgiref)

### Pattern 4: Wiring Event Triggers (FNDX-02)

**What:** Call Celery tasks at the point where conversations end and check-ins are submitted
**When to use:** After conversation lifecycle events and check-in creation

**Trigger points identified:**
1. **Conversation ended** -- No explicit "end conversation" action exists. Best proxy: fire `on_conversation_ended.delay(conversation_id, user_id)` after the last message in `reframe_message` or `comfort_message` view, OR add a new `end_conversation` endpoint.
2. **Check-in submitted** -- Fire `on_checkin_submitted.delay(user_id)` after `DailyCheckIn.objects.create()` in `submit_checkin` and `submit_detailed_checkin` views.

**Pattern:**
```python
# In checkins/views.py after creating checkin
from apps.intelligence.tasks import on_checkin_submitted
try:
    on_checkin_submitted.delay(str(user.id))
except Exception as e:
    logger.warning("Failed to queue checkin trigger: %s", e)
```

### Anti-Patterns to Avoid

- **Mutating state in-place in LangGraph nodes:** Nodes must return a partial dict update. Mutating `state['key'] = value` and returning the full state causes issues with state reducers.
- **Using `asyncio.run()` inside an already-running event loop:** Always use `async_to_sync` or make the caller async.
- **Importing Celery tasks at module level in views:** Use lazy imports to avoid circular dependency issues.
- **Eagerly compiling graphs at module level:** If the graph imports Django ORM models, Django's app registry may not be ready at import time.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event loop bridging | Custom loop management | `asgiref.sync.async_to_sync` | Handles thread-safety, Django ORM compat |
| Lazy singleton | Custom metaclass | Global `_compiled_graph` + getter function | Simple, thread-safe enough for Django |
| Periodic task scheduling | Custom cron daemon | `django-celery-beat` (already configured) | Already in settings, production-tested |
| Model factory for agents | `state['model_factory']` pattern | Direct `(state, model)` parameter | Cleaner, testable, no magic state keys |

**Key insight:** Every problem in this phase has a standard Django/LangGraph solution. None require custom infrastructure.

## Common Pitfalls

### Pitfall 1: Agent Signature Mismatch Between Definition and Invocation
**What goes wrong:** Agent nodes are defined as `async def node(state)` accessing `state['model_factory']`, but `analysis_graph.py` wrappers call them as `node(state, model)` with a sync model. This crashes immediately at runtime.
**Why it happens:** The agents were written for a different graph architecture (async with model factory in state) but the graph wrappers were later rewritten to use sync with explicit model parameters.
**How to avoid:** After fixing, run `graph.invoke()` with a mock state to verify all nodes accept `(state, model)` and are sync.
**Warning signs:** `TypeError: node() takes 1 positional argument but 2 were given` or `TypeError: object dict can't be used in 'await' expression`.

### Pitfall 2: EthicsBlockError Import Mismatch
**What goes wrong:** `analysis_graph.py` line 124 imports `EthicsBlockError` from `ethics_guardian.py`, but that module defines `EthicsReviewFailed`. This will crash with `ImportError`.
**Why it happens:** Name was changed in one file but not the other.
**How to avoid:** Rename the exception class to be consistent, or add an alias.
**Warning signs:** `ImportError: cannot import name 'EthicsBlockError' from 'apps.intelligence.services.agents.ethics_guardian'`.

### Pitfall 3: report_synthesizer Output Key Mismatch
**What goes wrong:** `report_synthesizer.py` writes to `state['report']`, but `analysis_graph.py`'s `save_report_node` reads from `state.get('report_title')`, `state.get('report_summary')`, etc. The synthesizer bundles everything under `state['report']` as a nested dict, but the save node expects flat top-level keys.
**Why it happens:** Two different assumptions about state shape between the synthesizer and the save node.
**How to avoid:** Either flatten the synthesizer output to match `AnalysisState` keys, or update `save_report_node` to unpack from `state['report']`.

### Pitfall 4: asyncio.run() Under Daphne
**What goes wrong:** `asyncio.run()` creates a new event loop, but Daphne already has one running. This raises `RuntimeError: asyncio.run() cannot be called from a running event loop`.
**Why it happens:** Views were written for WSGI (no event loop) but Daphne runs ASGI (event loop always present).
**How to avoid:** Replace all `asyncio.run()` calls with `asgiref.sync.async_to_sync()`.
**Warning signs:** Works fine with `manage.py runserver` (WSGI mode) but crashes under `daphne` or any ASGI deployment.
**Affected files:**
  - `backend/apps/chat/views.py` lines 334, 623
  - `backend/apps/audio/views.py` lines 380, 434
  - `backend/apps/chat/services/reframing_graph.py` line 312

### Pitfall 5: Dependency Upgrade Breaking Changes
**What goes wrong:** Major version jumps in LangChain ecosystem can change APIs.
**Why it happens:** LangChain ecosystem moves fast; 0.x to 1.x transitions changed many APIs.
**How to avoid:** The current codebase is already on LangChain 1.x and LangGraph 1.x. The target upgrades are minor patches (1.0.7 -> 1.0.8, 1.2.7 -> 1.2.11). These should be safe. Run tests after upgrading.
**Warning signs:** Import errors or changed function signatures after `pip install --upgrade`.

### Pitfall 6: Missing Conversation End Event
**What goes wrong:** There is no explicit "end conversation" action in the current API. The `on_conversation_ended` Celery task exists but has no clear trigger point.
**Why it happens:** The mobile app doesn't have a "close conversation" button. Users just navigate away.
**How to avoid:** Two options: (a) fire after each message exchange (too aggressive), or (b) add an explicit `POST /conversations/{id}/end/` endpoint. Option (b) is cleaner -- let the mobile app call it when the user navigates away from the chat screen.

## Code Examples

### Example 1: Fixed Pattern Analyst Node (FNDX-01)

```python
# Source: Derived from codebase analysis + LangGraph docs pattern
def pattern_node(state: dict, model) -> dict:
    """Analyze communication patterns from therapy data.

    Args:
        state: AnalysisState dict with therapy_context
        model: Pre-configured LangChain chat model
    Returns:
        dict with 'pattern_analysis' key
    """
    context = state.get('therapy_context', {})
    context_str = json.dumps({
        'accumulated_patterns': context.get('accumulated_patterns', {}),
        'conversation_summaries': context.get('conversation_summaries', {}),
        'weekly_summaries': context.get('weekly_summaries', []),
        'user_profile': context.get('user_profile', {}),
    }, ensure_ascii=False, default=str)

    prompt = PATTERN_ANALYST_PROMPT.format(context=context_str)
    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content="Analyze the therapy data for communication patterns."),
    ]

    try:
        response = model.invoke(messages)
        result = _parse_json(response.content)
    except Exception:
        logger.exception("Pattern analyst failed")
        result = {'summary': 'Pattern analysis failed.', 'data_quality': 'insufficient'}

    return {'pattern_analysis': result}
```

### Example 2: Fixing asyncio.run() in Views (FNDX-03)

```python
# Source: Django/asgiref docs pattern
from asgiref.sync import async_to_sync

# BEFORE (broken under Daphne):
# result = asyncio.run(run_reframing_pipeline(...))

# AFTER (works under both WSGI and ASGI):
result = async_to_sync(run_reframing_pipeline)(
    user_message=user_message,
    conversation_context=conversation_context,
    user_context=user_context,
)
```

### Example 3: Wiring Check-in Trigger (FNDX-02)

```python
# In checkins/views.py, after DailyCheckIn.objects.create():
from django.conf import settings

# Only fire trigger if accumulative therapy is enabled
if getattr(settings, 'ACCUMULATIVE_THERAPY_ENABLED', False):
    try:
        from apps.intelligence.tasks import on_checkin_submitted
        on_checkin_submitted.delay(str(user.id))
    except Exception as e:
        logger.warning("Failed to queue checkin analysis trigger: %s", e)
```

### Example 4: Lazy Compilation for chat_graph.py (FNDX-04)

```python
# Replace line 251:
# _compiled_graph = _build_graph().compile()

# With:
_compiled_graph = None

def _get_compiled_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = _build_graph().compile()
    return _compiled_graph

# And update run_chat_agent_pipeline to use _get_compiled_graph():
async def run_chat_agent_pipeline(...):
    ...
    result_state = await _get_compiled_graph().ainvoke(initial_state)
    ...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LangGraph 0.x (pre-1.0) | LangGraph 1.0.x (stable) | Oct 2025 | Stable API, no breaking changes expected in patches |
| LangChain 0.x | LangChain 1.x | Late 2025 | Unified interface, create_agent pattern |
| asyncio.run() in Django | async views / async_to_sync | Django 4.1+ (2022) | Native ASGI support |
| Eager graph compilation | Lazy compilation | LangGraph best practice | Avoids import-time errors |

**Deprecated/outdated:**
- `asyncio.run()` in ASGI contexts: Use `async_to_sync` or native async views
- `state['model_factory']` pattern in LangGraph nodes: Pass model as explicit parameter

## Specific Bugs Found During Research

These are concrete bugs that MUST be fixed in this phase:

### Bug 1: Agent Signature Mismatch (ALL 6 agents)
- **Files:** `pattern_analyst.py`, `emotion_interpreter.py`, `balance_mediator.py`, `resolution_strategist.py`, `report_synthesizer.py`, `ethics_guardian.py`
- **Problem:** All agents define `async def xxx_node(state: dict) -> dict` accessing `state['model_factory']`, but `analysis_graph.py` wrapper nodes call them as `xxx_node(state, model)`
- **Fix:** Rewrite each agent as `def xxx_node(state: dict, model) -> dict` using `model.invoke()` instead of `await model.ainvoke()`

### Bug 2: EthicsBlockError vs EthicsReviewFailed
- **File:** `analysis_graph.py` line 124 imports `EthicsBlockError`
- **File:** `ethics_guardian.py` line 18 defines `EthicsReviewFailed`
- **Fix:** Rename `EthicsReviewFailed` to `EthicsBlockError` in `ethics_guardian.py` (or add alias)

### Bug 3: report_synthesizer Output Key Mismatch
- **File:** `report_synthesizer.py` writes to `state['report']` (nested dict)
- **File:** `analysis_graph.py` `save_report_node` reads `state.get('report_title')`, `state.get('report_summary')`, etc. (flat keys)
- **Fix:** Change `report_synthesizer.py` to return flat keys matching `AnalysisState`: `{'report_title': ..., 'report_summary': ..., 'key_insights': ..., 'suggested_actions': ..., 'recommended_activities': ...}`

### Bug 4: ethics_guardian Uses state['report'] But Also Has Wrong Signature
- **File:** `ethics_guardian.py` accesses `state.get('report', {})` for report content
- **Problem:** After fixing synthesizer (Bug 3), the report fields will be flat in state, not nested under `state['report']`
- **Fix:** Update ethics_guardian to read flat state keys or synthesize a report dict from flat state

### Bug 5: Eager Compilation in chat_graph.py
- **File:** `chat_graph.py` line 251: `_compiled_graph = _build_graph().compile()`
- **Problem:** Compiles at import time, may fail if Django apps not loaded
- **Fix:** Use lazy compilation pattern (already shown in analysis_graph.py)

## Open Questions

1. **Conversation End Event Mechanism**
   - What we know: `on_conversation_ended` Celery task exists but no trigger point in any view
   - What's unclear: Should this fire after every message, or should there be an explicit "end conversation" endpoint?
   - Recommendation: Add a `POST /conversations/{id}/end/` endpoint that the mobile app calls when user navigates away. This is cleaner than firing after every message. Alternatively, trigger after each message exchange but with the cooldown mechanism in the trigger service preventing excessive analysis.

2. **DRF Async View Compatibility**
   - What we know: Django 5.2 supports async views natively. DRF `@api_view` has limited async support.
   - What's unclear: Does DRF 3.16 fully support `async def` with `@api_view`?
   - Recommendation: Use `async_to_sync` wrapper (Option B) to avoid this question entirely. It works with both WSGI and ASGI and requires no changes to view decorators.

3. **STAK-01 Target Versions**
   - What we know: The requirement mentions "langgraph 1.0.8, langchain-core 1.2.11, psycopg 3.3.2"
   - What's unclear: psycopg is already at 3.3.2. Are there specific version targets for langchain-openai, langchain-anthropic, langchain-google-genai?
   - Recommendation: Upgrade LangChain ecosystem packages to latest within their current major version. Pin in requirements.txt after testing.

4. **STAK-02 Mobile Compatibility**
   - What we know: Expo SDK 54.0.33 is the latest release (Feb 2026), React Native 0.81.5, React 19.1.0
   - What's unclear: Are there any known issues with current mobile dependencies?
   - Recommendation: Run `npx expo-doctor` to check for compatibility issues. The mobile stack appears current -- STAK-02 may just be a verification step.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: Direct reading of all affected files in `backend/apps/intelligence/`, `backend/apps/chat/`, `backend/apps/checkins/`, `backend/config/`
- [LangGraph GitHub - Official Examples](https://github.com/langchain-ai/langgraph/releases) - Node signature patterns confirmed: `def node(state) -> dict`
- [LangGraph Official Docs](https://docs.langchain.com/oss/python/langgraph/) - StateGraph invoke/ainvoke, sync/async node support
- [Django Async Documentation](https://django.readthedocs.io/en/stable/topics/async.html) - async_to_sync, ASGI view support

### Secondary (MEDIUM confidence)
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) - Confirmed Expo 54 ships with RN 0.81 + React 19.1
- [LangGraph 1.0 GA Announcement](https://changelog.langchain.com/announcements/langgraph-1-0-is-now-generally-available) - Stable API commitment
- [Daphne asyncio issue](https://github.com/django/daphne/issues/299) - Event loop interaction with asyncio.run()

### Tertiary (LOW confidence)
- [LangGraph 1.0.8 release info](https://github.com/langchain-ai/langgraph/releases) - Specific 1.0.8 changes (shallow copy fixes, pydantic streaming fixes) -- could not verify full changelog in detail

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages currently installed, versions verified via `pip list`
- Architecture patterns: HIGH - All patterns derived from actual codebase reading + official LangGraph docs
- Bug identification: HIGH - Every bug verified by reading actual source code, not speculation
- Pitfalls: HIGH - Based on specific code paths found in codebase
- Dependency targets: MEDIUM - Exact latest versions not verified via PyPI; using requirement-specified targets

**Research date:** 2026-02-13
**Valid until:** 2026-03-13 (stable domain, minor patches only)
