"""Two-mode reframing pipeline.

Replaces the multi-node LangGraph StateGraph with a single-call architecture.
The LLM decides between two modes per message:

1. Chat mode: conversational empathy, clarifying questions (plain text)
2. Reframing mode: structured bidirectional analysis (JSON with analysis + suggestions)

Safety is handled via keyword pre-filter before the LLM call (0 LLM calls for severe abuse).
Normal messages use exactly 1 LLM call.
"""

import asyncio
import copy
import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from ..prompts.system_prompts import (
    TWO_MODE_SYSTEM_PROMPT,
    COMFORT_MODE_PROMPT,
    SAFETY_RESPONSE_TEMPLATE,
    SAFETY_KEYWORDS,
    build_personalized_prompt,
)
from .llm_service import get_chat_model

logger = logging.getLogger(__name__)


def _parse_json_response(response: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""
    # Strip whitespace
    response = response.strip()

    # Remove markdown code blocks (```json ... ``` or ``` ... ```)
    # Handle various formats: ```json, ```JSON, just ```
    code_block_pattern = r'```(?:json|JSON)?\s*\n?(.*?)\n?```'
    match = re.search(code_block_pattern, response, re.DOTALL)
    if match:
        response = match.group(1).strip()

    # Try to find JSON object in the response
    # Look for first { and last }
    start = response.find('{')
    end = response.rfind('}')

    if start != -1 and end != -1 and end > start:
        json_str = response[start:end + 1]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            logger.debug("JSON substring parse failed, trying full response")

    # Try parsing the whole response as JSON
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse JSON response: {response[:200]}...")
        return {}


def check_safety(message: str) -> dict | None:
    """Check for abuse patterns using keyword pre-filter.

    No LLM call. Uses simple string matching (Korean has no word boundaries).

    Args:
        message: The user's message text

    Returns:
        - For severe match: copy of SAFETY_RESPONSE_TEMPLATE with is_abuse_detected=True
        - For mild match: {"mild_flag": True} (LLM still processes)
        - No match: None
    """
    # Check severe keywords first
    for keyword in SAFETY_KEYWORDS["severe"]:
        if keyword in message:
            logger.warning(f"Severe safety keyword detected: {keyword}")
            result = copy.deepcopy(SAFETY_RESPONSE_TEMPLATE)
            result["is_abuse_detected"] = True
            return result

    # Check mild keywords
    for keyword in SAFETY_KEYWORDS["mild"]:
        if keyword in message:
            logger.info(f"Mild safety keyword detected: {keyword}")
            return {"mild_flag": True}

    return None


def _build_readable_response(parsed: dict) -> str:
    """Build natural Korean text from structured reframing JSON.

    Creates a readable response for the chat bubble from the structured
    reframing analysis. This is stored as the message content.

    Args:
        parsed: Parsed reframing JSON with acknowledgment, analysis, suggestions

    Returns:
        str: Natural Korean text suitable for chat display
    """
    parts = []

    # Acknowledgment
    acknowledgment = parsed.get("acknowledgment", "")
    if acknowledgment:
        parts.append(acknowledgment)

    # Analysis sections
    analysis = parsed.get("analysis", {})
    if analysis:
        how_they_heard = analysis.get("how_they_heard", "")
        if how_they_heard:
            parts.append(f"상대방은 이렇게 들었을 수 있어요:\n{how_they_heard}")

        why_the_gap = analysis.get("why_the_gap", "")
        if why_the_gap:
            parts.append(f"왜 이런 차이가 생겼을까요:\n{why_the_gap}")

    # Suggestions
    suggestions = parsed.get("suggestions", [])
    if suggestions:
        suggestion_lines = "\n".join(f"- {s}" for s in suggestions)
        parts.append(f"다음에 시도해볼 것:\n{suggestion_lines}")

    return "\n\n".join(parts)


async def run_reframing_pipeline(
    user_message: str,
    conversation_context: str = "",
    user_context: dict | None = None,
) -> dict:
    """Run the two-mode reframing pipeline on a user message.

    Single LLM call. The LLM decides whether to respond conversationally
    (chat mode) or produce structured reframing analysis (reframing mode).

    Args:
        user_message: The user's message describing a conflict
        conversation_context: Summary/history of prior conversation
        user_context: Optional user intelligence context (for personalization)

    Returns:
        dict with:
            - mode: 'chat' or 'reframing'
            - final_response: The text response for chat display
            - analysis: Structured analysis data (reframing mode only)
            - suggestions: List of suggestions (reframing mode only)
            - is_abuse_detected: Whether abuse was detected
            - safety_response: Safety template (abuse cases only)
    """
    # Feature flag: route to new chat agent when enabled
    from django.conf import settings as django_settings

    if getattr(django_settings, 'ACCUMULATIVE_THERAPY_ENABLED', False):
        from .chat_agent.chat_graph import run_chat_agent_pipeline

        return await run_chat_agent_pipeline(
            user_message=user_message,
            conversation_context=conversation_context,
            user_context=user_context,
        )

    # Step 1: Safety pre-filter (no LLM call)
    safety_result = check_safety(user_message)

    if safety_result and safety_result.get("is_abuse_detected"):
        logger.info("Severe abuse detected - returning safety response immediately")
        return {
            "mode": "reframing",
            "final_response": safety_result["acknowledgment"],
            "analysis": safety_result["analysis"],
            "suggestions": safety_result["suggestions"],
            "is_abuse_detected": True,
            "safety_response": safety_result,
        }

    # Step 2: Build messages for LLM
    system_prompt = build_personalized_prompt(
        TWO_MODE_SYSTEM_PROMPT, user_context, mode='reframing',
    )
    messages = [
        SystemMessage(content=system_prompt),
    ]

    # Build human message with context
    human_parts = []
    if conversation_context:
        human_parts.append(conversation_context)
    human_parts.append(f"\n\n사용자 메시지: {user_message}")

    messages.append(HumanMessage(content="".join(human_parts)))

    # Step 3: Single LLM call
    model = get_chat_model(temperature=0.6, streaming=False)
    response = await model.ainvoke(messages)

    # Step 4: Parse JSON response
    parsed = _parse_json_response(response.content)

    # Step 5: Route based on mode
    mode = parsed.get("mode", "")

    if mode == "chat":
        return {
            "mode": "chat",
            "final_response": parsed.get("message", ""),
            "analysis": None,
            "suggestions": [],
            "is_abuse_detected": False,
            "safety_response": None,
        }

    if mode == "reframing":
        return {
            "mode": "reframing",
            "final_response": _build_readable_response(parsed),
            "analysis": parsed.get("analysis"),
            "suggestions": parsed.get("suggestions", []),
            "is_abuse_detected": False,
            "safety_response": None,
        }

    # Fallback: unrecognized mode - treat as chat
    logger.warning(f"Unrecognized mode '{mode}' in LLM response, falling back to chat")
    return {
        "mode": "chat",
        "final_response": parsed.get("message", str(parsed)),
        "analysis": None,
        "suggestions": [],
        "is_abuse_detected": False,
        "safety_response": None,
    }


async def run_comfort_pipeline(
    user_message: str,
    conversation_context: str = "",
    user_context: dict | None = None,
) -> dict:
    """Run the comfort mode pipeline - empathetic response without reframing.

    Uses COMFORT_MODE_PROMPT to generate a warm, supportive response
    that validates the user's emotions without analysis or suggestions.

    Args:
        user_message: The user's message expressing difficult emotions
        conversation_context: Summary/history of prior conversation

    Returns:
        dict with:
            - mode: 'comfort'
            - final_response: The empathetic response text
            - is_abuse_detected: False (comfort mode doesn't detect abuse)
    """
    # Safety pre-filter still applies
    safety_result = check_safety(user_message)

    if safety_result and safety_result.get("is_abuse_detected"):
        logger.info("Severe abuse detected in comfort mode - returning safety response")
        return {
            "mode": "comfort",
            "final_response": safety_result["acknowledgment"],
            "is_abuse_detected": True,
        }

    # Build messages for LLM
    system_prompt = build_personalized_prompt(
        COMFORT_MODE_PROMPT, user_context, mode='comfort',
    )
    messages = [
        SystemMessage(content=system_prompt),
    ]

    human_parts = []
    if conversation_context:
        human_parts.append(conversation_context)
    human_parts.append(f"\n\n사용자 메시지: {user_message}")

    messages.append(HumanMessage(content="".join(human_parts)))

    # Single LLM call
    model = get_chat_model(temperature=0.7, streaming=False)
    response = await model.ainvoke(messages)

    return {
        "mode": "comfort",
        "final_response": response.content,
        "is_abuse_detected": False,
    }


def run_reframing_pipeline_sync(
    user_message: str,
    conversation_context: str = "",
) -> dict:
    """Synchronous wrapper for run_reframing_pipeline.

    Args:
        user_message: The user's message describing a conflict
        conversation_context: Summary/history of prior conversation

    Returns:
        dict: Same as run_reframing_pipeline
    """
    return asyncio.run(run_reframing_pipeline(
        user_message=user_message,
        conversation_context=conversation_context,
    ))
