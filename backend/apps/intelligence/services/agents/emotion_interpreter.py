"""Emotion interpreter agent node for the analysis graph."""

import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from ...prompts.analysis_prompts import EMOTION_INTERPRETER_PROMPT

logger = logging.getLogger(__name__)


async def emotion_node(state: dict) -> dict:
    """Interpret emotional patterns and mood trajectories."""
    model = state['model_factory']('emotion_interpreter')
    context = state.get('therapy_context', {})

    context_str = json.dumps({
        'mood_trajectory': context.get('mood_trajectory', {}),
        'conversation_summaries': context.get('conversation_summaries', {}),
        'audio_insights': context.get('audio_insights', {}),
        'user_profile': context.get('user_profile', {}),
    }, ensure_ascii=False, default=str)

    prompt = EMOTION_INTERPRETER_PROMPT.format(context=context_str)

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content="위 치료 데이터를 기반으로 감정 분석을 수행해 주세요."),
    ]

    try:
        response = await model.ainvoke(messages)
        result = _parse_json(response.content)
    except Exception:
        logger.exception("Emotion interpreter failed")
        result = {
            'mood_interpretation': '',
            'emotional_patterns': [],
            'emotional_resilience': 'moderate',
            'key_emotional_triggers': [],
            'partner_emotional_dynamic': '',
            'data_quality': 'insufficient',
            'summary': '감정 분석을 수행할 수 없습니다.',
        }

    state['emotion_analysis'] = result
    return state


def _parse_json(text: str) -> dict:
    """Parse JSON from LLM response, handling markdown blocks."""
    text = text.strip()
    match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if match:
        text = match.group(1).strip()
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end > start:
        return json.loads(text[start:end + 1])
    return json.loads(text)
