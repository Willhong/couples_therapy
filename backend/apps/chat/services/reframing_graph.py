"""LangGraph reframing pipeline.

Implements a stateful workflow for perspective reframing:
1. Safety check -> routes to safety response if abuse detected
2. Acknowledge -> validates user's emotions
3. Analyze -> identifies perspectives from both sides
4. Suggest -> provides actionable suggestions
5. Combine -> assembles final response

Uses LangGraph StateGraph for workflow orchestration.
"""

import json
import logging
from typing import TypedDict, Literal, Any, AsyncIterator

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
from langgraph.graph import StateGraph, END

from ..prompts.system_prompts import (
    ACKNOWLEDGE_PROMPT,
    ANALYZE_PROMPT,
    SUGGEST_PROMPT,
    SAFETY_PROMPT,
    SAFETY_CHECK_PROMPT,
    COMBINE_PROMPT,
)
from .llm_service import get_chat_model

logger = logging.getLogger(__name__)


class ReframingState(TypedDict):
    """State schema for the reframing graph."""
    # Input
    user_message: str
    conversation_context: str  # Summary of prior conversation

    # Safety check results
    safety_check_result: dict | None
    is_abuse_detected: bool

    # Node outputs
    acknowledgment: str
    analysis: dict | None
    suggestions: list[str]
    safety_response: dict | None

    # Final output
    final_response: str

    # Streaming support
    streaming_chunks: list[str]


def _parse_json_response(response: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""
    import re

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
            pass

    # Try parsing the whole response as JSON
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse JSON response: {response[:200]}...")
        return {}


async def safety_check_node(state: ReframingState) -> dict:
    """Check for abuse patterns in user message.

    Routes to safety response if abuse is detected.
    """
    logger.info("Running safety check node")

    model = get_chat_model(temperature=0.1, streaming=False)

    prompt = SAFETY_CHECK_PROMPT.format(message=state['user_message'])
    messages = [HumanMessage(content=prompt)]

    response = await model.ainvoke(messages)
    result = _parse_json_response(response.content)

    is_abuse = result.get('is_abuse_detected', False)

    return {
        'safety_check_result': result,
        'is_abuse_detected': is_abuse,
    }


async def acknowledge_node(state: ReframingState) -> dict:
    """Validate and acknowledge user's emotions."""
    logger.info("Running acknowledge node")

    model = get_chat_model(temperature=0.7)

    context = ""
    if state.get('conversation_context'):
        context = f"[이전 대화 맥락]\n{state['conversation_context']}\n\n"

    messages = [
        SystemMessage(content=ACKNOWLEDGE_PROMPT),
        HumanMessage(content=f"{context}사용자 메시지: {state['user_message']}")
    ]

    response = await model.ainvoke(messages)

    return {
        'acknowledgment': response.content,
    }


async def analyze_node(state: ReframingState) -> dict:
    """Analyze perspectives from both sides."""
    logger.info("Running analyze node")

    model = get_chat_model(temperature=0.5)

    context = ""
    if state.get('conversation_context'):
        context = f"[이전 대화 맥락]\n{state['conversation_context']}\n\n"

    messages = [
        SystemMessage(content=ANALYZE_PROMPT),
        HumanMessage(content=f"{context}사용자 메시지: {state['user_message']}")
    ]

    response = await model.ainvoke(messages)
    analysis = _parse_json_response(response.content)

    return {
        'analysis': analysis,
    }


async def suggest_node(state: ReframingState) -> dict:
    """Generate actionable suggestions based on analysis."""
    logger.info("Running suggest node")

    model = get_chat_model(temperature=0.7)

    # Include analysis in context for suggestions
    analysis_context = ""
    if state.get('analysis'):
        analysis_context = f"[분석 결과]\n{json.dumps(state['analysis'], ensure_ascii=False, indent=2)}\n\n"

    messages = [
        SystemMessage(content=SUGGEST_PROMPT),
        HumanMessage(
            content=f"{analysis_context}사용자의 갈등 상황: {state['user_message']}"
        )
    ]

    response = await model.ainvoke(messages)
    suggestions_data = _parse_json_response(response.content)

    return {
        'suggestions': suggestions_data.get('suggestions', []),
    }


async def safety_response_node(state: ReframingState) -> dict:
    """Generate supportive response for detected abuse situations."""
    logger.info("Running safety response node")

    model = get_chat_model(temperature=0.5)

    safety_context = ""
    if state.get('safety_check_result'):
        severity = state['safety_check_result'].get('severity', 'unknown')
        patterns = state['safety_check_result'].get('patterns', [])
        safety_context = f"[감지된 심각도: {severity}]\n[패턴: {', '.join(patterns)}]\n\n"

    messages = [
        SystemMessage(content=SAFETY_PROMPT),
        HumanMessage(content=f"{safety_context}사용자 메시지: {state['user_message']}")
    ]

    response = await model.ainvoke(messages)
    safety_response = _parse_json_response(response.content)

    return {
        'safety_response': safety_response,
    }


async def combine_node(state: ReframingState) -> dict:
    """Combine all node outputs into final response."""
    logger.info("Running combine node")

    # Check if this is a safety response
    if state.get('is_abuse_detected') and state.get('safety_response'):
        safety = state['safety_response']
        final = f"{safety.get('concern_expressed', '')}\n\n"

        if safety.get('resources'):
            final += "도움받을 수 있는 곳:\n"
            for resource in safety['resources']:
                final += f"- {resource}\n"
            final += "\n"

        final += safety.get('support_message', '')

        return {'final_response': final}

    # Normal reframing response
    model = get_chat_model(temperature=0.7)

    prompt = COMBINE_PROMPT.format(
        acknowledgment=state.get('acknowledgment', ''),
        analysis=json.dumps(state.get('analysis', {}), ensure_ascii=False),
        suggestions=json.dumps(state.get('suggestions', []), ensure_ascii=False),
    )

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=f"사용자 원본 메시지: {state['user_message']}")
    ]

    response = await model.ainvoke(messages)

    return {
        'final_response': response.content,
    }


def route_after_safety_check(state: ReframingState) -> Literal["safety_response", "acknowledge"]:
    """Route based on safety check results."""
    if state.get('is_abuse_detected'):
        severity = state.get('safety_check_result', {}).get('severity', 'none')
        # Only route to safety for severe cases
        # Mild cases get normal reframing + gentle flag
        if severity == 'severe':
            return "safety_response"
    return "acknowledge"


def build_reframing_graph() -> StateGraph:
    """Build the reframing graph workflow.

    Graph structure:
    START -> safety_check -> [abuse: safety_response | normal: acknowledge]
    acknowledge -> analyze -> suggest -> combine -> END
    safety_response -> combine -> END
    """
    graph = StateGraph(ReframingState)

    # Add nodes
    graph.add_node("safety_check", safety_check_node)
    graph.add_node("acknowledge", acknowledge_node)
    graph.add_node("analyze", analyze_node)
    graph.add_node("suggest", suggest_node)
    graph.add_node("safety_response", safety_response_node)
    graph.add_node("combine", combine_node)

    # Set entry point
    graph.set_entry_point("safety_check")

    # Add conditional edge after safety check
    graph.add_conditional_edges(
        "safety_check",
        route_after_safety_check,
        {
            "safety_response": "safety_response",
            "acknowledge": "acknowledge",
        }
    )

    # Normal flow edges
    graph.add_edge("acknowledge", "analyze")
    graph.add_edge("analyze", "suggest")
    graph.add_edge("suggest", "combine")

    # Safety flow edges
    graph.add_edge("safety_response", "combine")

    # End
    graph.add_edge("combine", END)

    return graph


# Compiled graph instance
reframing_graph = build_reframing_graph().compile()


async def run_reframing_pipeline(
    user_message: str,
    conversation_context: str = "",
) -> dict:
    """Run the reframing pipeline on a user message.

    Args:
        user_message: The user's message describing a conflict
        conversation_context: Summary of prior conversation for context

    Returns:
        dict with:
            - final_response: The complete reframing response
            - analysis: Structured analysis data (if available)
            - suggestions: List of suggestions (if available)
            - is_abuse_detected: Whether abuse was detected
    """
    initial_state: ReframingState = {
        'user_message': user_message,
        'conversation_context': conversation_context,
        'safety_check_result': None,
        'is_abuse_detected': False,
        'acknowledgment': '',
        'analysis': None,
        'suggestions': [],
        'safety_response': None,
        'final_response': '',
        'streaming_chunks': [],
    }

    result = await reframing_graph.ainvoke(initial_state)

    return {
        'final_response': result.get('final_response', ''),
        'analysis': result.get('analysis'),
        'suggestions': result.get('suggestions', []),
        'is_abuse_detected': result.get('is_abuse_detected', False),
        'safety_response': result.get('safety_response'),
    }


async def stream_reframing_pipeline(
    user_message: str,
    conversation_context: str = "",
) -> AsyncIterator[dict]:
    """Stream the reframing pipeline, yielding progress updates.

    Yields status updates as each node completes, then final response.

    Args:
        user_message: The user's message
        conversation_context: Prior conversation summary

    Yields:
        dicts with status updates and final response
    """
    initial_state: ReframingState = {
        'user_message': user_message,
        'conversation_context': conversation_context,
        'safety_check_result': None,
        'is_abuse_detected': False,
        'acknowledgment': '',
        'analysis': None,
        'suggestions': [],
        'safety_response': None,
        'final_response': '',
        'streaming_chunks': [],
    }

    node_status_messages = {
        'safety_check': '안전성을 확인하고 있어요...',
        'acknowledge': '감정을 이해하고 있어요...',
        'analyze': '양측의 관점을 분석하고 있어요...',
        'suggest': '구체적인 제안을 준비하고 있어요...',
        'combine': '응답을 정리하고 있어요...',
        'safety_response': '지원 정보를 준비하고 있어요...',
    }

    async for event in reframing_graph.astream(initial_state):
        for node_name, node_output in event.items():
            if node_name in node_status_messages:
                yield {
                    'type': 'status',
                    'node': node_name,
                    'message': node_status_messages[node_name],
                }

            if node_name == 'combine' and 'final_response' in node_output:
                yield {
                    'type': 'complete',
                    'final_response': node_output['final_response'],
                    'analysis': node_output.get('analysis'),
                    'suggestions': node_output.get('suggestions', []),
                }
