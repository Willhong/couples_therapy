"""LangGraph-based chat agent pipeline for accumulative therapy.

Implements a therapeutic listener that gathers information through
empathetic conversation. Uses a StateGraph with phase determination,
checklist evaluation, and response generation nodes.
"""

import json
import logging
import re
from typing import TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from ...prompts.chat_agent_prompts import (
    THERAPEUTIC_LISTENER_PROMPT,
    build_personalized_prompt,
)
from ..llm_service import get_chat_model
from .information_state import ChatAgentState, ConflictInformation

logger = logging.getLogger(__name__)

# Checklist fields that are boolean flags
_CHECKLIST_BOOL_FIELDS = [
    "event_described",
    "user_emotion_expressed",
    "partner_behavior_described",
    "trigger_identified",
    "context_provided",
    "desired_outcome_expressed",
]

# Human-readable labels for missing information (Korean)
_CHECKLIST_LABELS = {
    "event_described": "구체적인 갈등 상황",
    "user_emotion_expressed": "사용자의 감정",
    "partner_behavior_described": "상대방의 행동/반응",
    "trigger_identified": "갈등의 촉발 요인",
    "context_provided": "상황의 맥락/배경",
    "desired_outcome_expressed": "사용자가 원하는 결과",
}


class ChatGraphState(TypedDict, total=False):
    """Internal graph state for the chat agent pipeline."""

    user_message: str
    conversation_context: str
    user_context: dict
    chat_state: ChatAgentState
    conflict_info: ConflictInformation
    conversation_phase: str
    message_count: int
    information_checklist_status: str
    missing_information: str
    llm_response: str
    parsed_response: dict
    final_result: dict


def _determine_phase(state: ChatGraphState) -> ChatGraphState:
    """Determine conversation phase based on message count and checklist."""
    message_count = state.get("message_count", 0)
    conflict_info = state.get("conflict_info", {})

    # Count how many checklist items are completed
    completed = sum(
        1 for field in _CHECKLIST_BOOL_FIELDS if conflict_info.get(field, False)
    )
    total = len(_CHECKLIST_BOOL_FIELDS)

    if message_count <= 1:
        phase = "initial"
    elif completed < 3:
        phase = "exploring"
    elif completed < total:
        phase = "deepening"
    else:
        phase = "wrapping_up"

    state["conversation_phase"] = phase
    return state


def _evaluate_checklist(state: ChatGraphState) -> ChatGraphState:
    """Build human-readable checklist status and missing info strings."""
    conflict_info = state.get("conflict_info", {})

    # Build checklist status string
    status_parts = []
    missing_parts = []

    for field in _CHECKLIST_BOOL_FIELDS:
        label = _CHECKLIST_LABELS[field]
        if conflict_info.get(field, False):
            status_parts.append(f"- [x] {label}")
        else:
            status_parts.append(f"- [ ] {label}")
            missing_parts.append(f"- {label}")

    state["information_checklist_status"] = "\n".join(status_parts)
    state["missing_information"] = (
        "\n".join(missing_parts) if missing_parts else "모든 기본 정보가 수집되었습니다."
    )

    return state


async def _generate_response(state: ChatGraphState) -> ChatGraphState:
    """Generate LLM response using the therapeutic listener prompt."""
    # Format the system prompt with checklist info
    base_prompt = THERAPEUTIC_LISTENER_PROMPT.format(
        information_checklist_status=state.get("information_checklist_status", ""),
        missing_information=state.get("missing_information", ""),
    )
    # Apply personalization from user_context
    system_prompt = build_personalized_prompt(
        base_prompt, state.get("user_context"), mode='chat_agent',
    )

    messages = [SystemMessage(content=system_prompt)]

    # Build human message with context
    human_parts = []
    if state.get("conversation_context"):
        human_parts.append(state["conversation_context"])
    human_parts.append(f"\n\n사용자 메시지: {state['user_message']}")

    messages.append(HumanMessage(content="".join(human_parts)))

    # Single LLM call
    model = get_chat_model(temperature=0.7, streaming=False)
    response = await model.ainvoke(messages)

    state["llm_response"] = response.content
    return state


def _parse_response(state: ChatGraphState) -> ChatGraphState:
    """Parse JSON response from LLM, with graceful fallback."""
    raw = state.get("llm_response", "")

    parsed = _parse_json_response(raw)

    if parsed and parsed.get("message"):
        state["parsed_response"] = parsed
    else:
        # Fallback: treat entire response as plain text chat message
        logger.warning("Chat agent JSON parse failed, falling back to plain text")
        state["parsed_response"] = {
            "mode": "chat",
            "message": raw.strip(),
            "checklist_update": {},
            "phase": state.get("conversation_phase", "exploring"),
        }

    return state


def _parse_json_response(response: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""
    response = response.strip()

    # Remove markdown code blocks
    code_block_pattern = r"```(?:json|JSON)?\s*\n?(.*?)\n?```"
    match = re.search(code_block_pattern, response, re.DOTALL)
    if match:
        response = match.group(1).strip()

    # Try to find JSON object
    start = response.find("{")
    end = response.rfind("}")

    if start != -1 and end != -1 and end > start:
        json_str = response[start : end + 1]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            logger.debug("JSON substring parse failed, trying full response")

    # Try full response
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse chat agent JSON: {response[:200]}...")
        return {}


def _build_result(state: ChatGraphState) -> ChatGraphState:
    """Build the final result dict from parsed response."""
    parsed = state.get("parsed_response", {})
    conflict_info = state.get("conflict_info", {})

    # Apply checklist updates from LLM response
    checklist_update = parsed.get("checklist_update", {})
    if checklist_update and isinstance(checklist_update, dict):
        for key, value in checklist_update.items():
            if key in _CHECKLIST_BOOL_FIELDS and isinstance(value, bool):
                conflict_info[key] = value
            elif key in ("conflict_topic", "escalation_level") and isinstance(
                value, str
            ):
                conflict_info[key] = value
            elif key in ("user_emotions", "partner_emotions", "key_quotes"):
                existing = conflict_info.get(key, [])
                if isinstance(value, list):
                    conflict_info[key] = list(set(existing + value))
                elif isinstance(value, str):
                    if value not in existing:
                        conflict_info[key] = existing + [value]

    phase = parsed.get("phase", state.get("conversation_phase", "exploring"))

    state["final_result"] = {
        "mode": "chat",
        "final_response": parsed.get("message", ""),
        "checklist_update": conflict_info,
        "phase": phase,
        "analysis": None,
        "suggestions": [],
        "is_abuse_detected": False,
        "safety_response": None,
    }

    return state


def _build_graph() -> StateGraph:
    """Build the chat agent StateGraph."""
    graph = StateGraph(ChatGraphState)

    graph.add_node("determine_phase", _determine_phase)
    graph.add_node("evaluate_checklist", _evaluate_checklist)
    graph.add_node("generate_response", _generate_response)
    graph.add_node("parse_response", _parse_response)
    graph.add_node("build_result", _build_result)

    graph.set_entry_point("determine_phase")
    graph.add_edge("determine_phase", "evaluate_checklist")
    graph.add_edge("evaluate_checklist", "generate_response")
    graph.add_edge("generate_response", "parse_response")
    graph.add_edge("parse_response", "build_result")
    graph.add_edge("build_result", END)

    return graph


# Lazy compilation (avoid import-time side effects)
_compiled_graph = None


def _get_compiled_graph():
    """Compile and cache the graph on first use."""
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = _build_graph().compile()
    return _compiled_graph


async def run_chat_agent_pipeline(
    user_message: str,
    conversation_context: str = "",
    user_context: dict | None = None,
    chat_state: ChatAgentState | None = None,
) -> dict:
    """Run the therapeutic listener chat agent pipeline.

    Entry point for the accumulative therapy chat system. Gathers information
    through empathetic conversation without providing analysis or suggestions.

    Args:
        user_message: The user's message text.
        conversation_context: Summary/history of prior conversation.
        user_context: Optional user intelligence context (for later personalization).
        chat_state: Optional existing chat state to continue from.

    Returns:
        dict with:
            - mode: 'chat'
            - final_response: The empathetic response text
            - checklist_update: Updated conflict information dict
            - phase: Current conversation phase
            - analysis: None (chat agent does not analyze)
            - suggestions: [] (chat agent does not suggest)
            - is_abuse_detected: False
            - safety_response: None
    """
    # Initialize or restore state
    if chat_state is None:
        chat_state = ChatAgentState(
            message_count=0,
            conflict_info=ConflictInformation(),
            conversation_phase="initial",
            missing_information=[],
            mood_trajectory=[],
        )

    message_count = chat_state.get("message_count", 0) + 1

    initial_state: ChatGraphState = {
        "user_message": user_message,
        "conversation_context": conversation_context,
        "user_context": user_context or {},
        "chat_state": chat_state,
        "conflict_info": chat_state.get("conflict_info", {}),
        "message_count": message_count,
    }

    # Run the graph
    result_state = await _get_compiled_graph().ainvoke(initial_state)

    return result_state.get("final_result", {
        "mode": "chat",
        "final_response": "",
        "checklist_update": {},
        "phase": "exploring",
        "analysis": None,
        "suggestions": [],
        "is_abuse_detected": False,
        "safety_response": None,
    })
