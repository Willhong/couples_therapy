"""Report synthesizer agent node for the analysis graph.

Produces the final Korean-language insight report from all analysis results.
"""

import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from ...prompts.analysis_prompts import REPORT_SYNTHESIZER_PROMPT

logger = logging.getLogger(__name__)


def synthesizer_node(state: dict, model) -> dict:
    """Synthesize all analyses into a user-facing Korean report."""
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
        HumanMessage(
            content="Generate a practical Korean therapy report from all analysis output as strict JSON.",
        ),
    ]

    try:
        response = model.invoke(messages)
        result = _parse_json(response.content)
    except Exception:
        logger.exception("Report synthesizer failed")
        result = {
            'report_title': 'Insight report',
            'report_summary': 'Report synthesis failed; partial data is available.',
            'key_insights': [],
            'suggested_actions': [],
            'recommended_activities': [],
            'encouragement': 'Please review available analytics and continue.',
        }

    return {
        'report_title': result.get('report_title', 'Insight report'),
        'report_summary': result.get('report_summary', ''),
        'key_insights': result.get('key_insights', []),
        'suggested_actions': result.get('suggested_actions', []),
        'recommended_activities': result.get('recommended_activities', []),
        'encouragement': result.get('encouragement', ''),
    }


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
