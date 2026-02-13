"""Ethics guardian agent node for the analysis graph.

BLOCK on failure: if ethics review fails, the report is not delivered.
This is a fail-safe gate before report delivery.
"""

import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from ...prompts.analysis_prompts import ETHICS_GUARDIAN_PROMPT

logger = logging.getLogger(__name__)


class EthicsBlockError(Exception):
    """Raised when ethics review rejects the report."""


def ethics_node(state: dict, model) -> dict:
    """Review report for ethical compliance. Blocks on failure."""
    report = state.get('report')
    if not isinstance(report, dict):
        report = {
            'report_title': state.get('report_title', ''),
            'report_summary': state.get('report_summary', ''),
            'key_insights': state.get('key_insights', []),
            'suggested_actions': state.get('suggested_actions', []),
            'recommended_activities': state.get('recommended_activities', []),
            'encouragement': state.get('encouragement', ''),
            'pattern_analysis': state.get('pattern_analysis', {}),
            'emotion_analysis': state.get('emotion_analysis', {}),
            'balance_analysis': state.get('balance_analysis', {}),
            'resolution_suggestions': state.get('resolution_suggestions', {}),
        }

    report_str = json.dumps(report, ensure_ascii=False, default=str)
    prompt = ETHICS_GUARDIAN_PROMPT.format(report_summary=report_str)

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(
            content=(
                "Review the submitted report, flag any emotional safety issues, and "
                "return strict JSON with an approved boolean."
            ),
        ),
    ]

    try:
        response = model.invoke(messages)
        result = _parse_json(response.content)
    except Exception:
        logger.exception("Ethics guardian failed - blocking report delivery")
        result = {
            'approved': False,
            'risk_level': 'high',
            'bias_detected': False,
            'bias_details': None,
            'safety_concerns': ['Ethics review failed due to system error'],
            'modifications_required': ['Manual review required'],
            'cultural_appropriateness': True,
            'professional_referral_flag': False,
            'review_notes': 'Ethics guardian encountered an error',
            'summary': 'Ethics review could not be completed.',
        }

    if not result.get('approved', False):
        logger.warning(
            "Ethics review BLOCKED report: %s",
            result.get('modifications_required', []),
        )
        raise EthicsBlockError(str(result.get('modifications_required', ['Blocked'])))

    return {'ethics_review': result}


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
