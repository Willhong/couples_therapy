"""Balance mediator agent node for the analysis graph.

Receives pattern and emotion analysis outputs and produces
a balanced, integrated view of the relationship dynamics.
"""

import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from ...prompts.analysis_prompts import BALANCE_MEDIATOR_PROMPT

logger = logging.getLogger(__name__)


def balance_node(state: dict, model) -> dict:
    """Produce balanced integration of pattern and emotion analyses."""
    context = state.get('therapy_context', {})

    pattern_str = json.dumps(
        state.get('pattern_analysis', {}), ensure_ascii=False, default=str,
    )
    emotion_str = json.dumps(
        state.get('emotion_analysis', {}), ensure_ascii=False, default=str,
    )
    context_str = json.dumps({
        'user_profile': context.get('user_profile', {}),
        'activity_engagement': context.get('activity_engagement', {}),
        'conflict_info': context.get('conflict_info', {}),
    }, ensure_ascii=False, default=str)

    prompt = BALANCE_MEDIATOR_PROMPT.format(
        pattern_analysis=pattern_str,
        emotion_analysis=emotion_str,
        context=context_str,
    )

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content="패턴 분석과 감정 분석 결과를 종합하여 균형 분석을 수행해 주세요."),
    ]

    try:
        response = model.invoke(messages)
        result = _parse_json(response.content)
    except Exception:
        logger.exception("Balance mediator failed")
        result = {
            'balance_assessment': '',
            'interaction_dynamics': '',
            'strengths': [],
            'growth_areas': [],
            'bias_check': 'unable to assess',
            'integrated_view': '',
            'summary': '균형 분석을 수행할 수 없습니다.',
        }

    return {'balance_analysis': result}


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
