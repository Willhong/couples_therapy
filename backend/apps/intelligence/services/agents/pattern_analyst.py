"""Pattern analyst agent node for the analysis graph."""

import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from ...prompts.analysis_prompts import PATTERN_ANALYST_PROMPT

logger = logging.getLogger(__name__)


async def pattern_node(state: dict) -> dict:
    """Analyze communication patterns from therapy data."""
    model = state['model_factory']('pattern_analyst')
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
        HumanMessage(content="위 치료 데이터를 기반으로 패턴 분석을 수행해 주세요."),
    ]

    try:
        response = await model.ainvoke(messages)
        result = _parse_json(response.content)
    except Exception:
        logger.exception("Pattern analyst failed")
        result = {
            'recurring_patterns': [],
            'trigger_analysis': '',
            'escalation_trend': 'stable',
            'positive_patterns': [],
            'data_quality': 'insufficient',
            'summary': '패턴 분석을 수행할 수 없습니다.',
        }

    state['pattern_analysis'] = result
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
