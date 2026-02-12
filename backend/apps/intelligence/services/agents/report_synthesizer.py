"""Report synthesizer agent node for the analysis graph.

Produces the final Korean-language insight report from all analysis results.
"""

import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from ...prompts.analysis_prompts import REPORT_SYNTHESIZER_PROMPT

logger = logging.getLogger(__name__)


async def synthesizer_node(state: dict) -> dict:
    """Synthesize all analyses into a user-facing Korean report."""
    model = state['model_factory']('report_synthesizer')

    pattern_str = json.dumps(
        state.get('pattern_analysis', {}), ensure_ascii=False, default=str,
    )
    emotion_str = json.dumps(
        state.get('emotion_analysis', {}), ensure_ascii=False, default=str,
    )
    balance_str = json.dumps(
        state.get('balance_analysis', {}), ensure_ascii=False, default=str,
    )
    resolution_str = json.dumps(
        state.get('resolution_suggestions', {}), ensure_ascii=False, default=str,
    )

    prompt = REPORT_SYNTHESIZER_PROMPT.format(
        pattern_analysis=pattern_str,
        emotion_analysis=emotion_str,
        balance_analysis=balance_str,
        resolution_suggestions=resolution_str,
    )

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content="모든 분석 결과를 종합하여 사용자를 위한 인사이트 보고서를 작성해 주세요."),
    ]

    try:
        response = await model.ainvoke(messages)
        result = _parse_json(response.content)
    except Exception:
        logger.exception("Report synthesizer failed")
        result = {
            'report_title': '인사이트 보고서',
            'report_summary': '분석 결과를 종합할 수 없습니다. 데이터가 충분히 수집되면 다시 시도해 주세요.',
            'key_insights': [],
            'suggested_actions': [],
            'recommended_activities': [],
            'encouragement': '함께 노력하고 계신 모습이 정말 대단합니다.',
        }

    state['report'] = result
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
