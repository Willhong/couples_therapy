"""Resolution strategist agent node for the analysis graph."""

import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from ...prompts.analysis_prompts import RESOLUTION_STRATEGIST_PROMPT

logger = logging.getLogger(__name__)


def resolution_node(state: dict, model) -> dict:
    """Generate actionable resolution strategies."""
    context = state.get('therapy_context', {})

    balance_str = json.dumps(
        state.get('balance_analysis', {}), ensure_ascii=False, default=str,
    )
    context_str = json.dumps({
        'user_profile': context.get('user_profile', {}),
        'activity_engagement': context.get('activity_engagement', {}),
        'weekly_summaries': context.get('weekly_summaries', []),
    }, ensure_ascii=False, default=str)

    prompt = RESOLUTION_STRATEGIST_PROMPT.format(
        balance_analysis=balance_str,
        context=context_str,
    )

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content="분석 결과를 바탕으로 실행 가능한 해결 전략을 제안해 주세요."),
    ]

    try:
        response = model.invoke(messages)
        result = _parse_json(response.content)
    except Exception:
        logger.exception("Resolution strategist failed")
        result = {
            'priority_actions': [],
            'communication_tips': [],
            'recommended_activities': [],
            'professional_referral_needed': False,
            'referral_reason': None,
            'weekly_focus': '',
            'summary': '해결 전략을 생성할 수 없습니다.',
        }

    return {'resolution_suggestions': result}


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
