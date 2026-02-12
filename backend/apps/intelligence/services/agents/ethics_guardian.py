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


class EthicsReviewFailed(Exception):
    """Raised when ethics review rejects the report."""
    pass


async def ethics_node(state: dict) -> dict:
    """Review report for ethical compliance. Blocks on failure."""
    model = state['model_factory']('ethics_guardian')

    report = state.get('report', {})
    report_str = json.dumps(report, ensure_ascii=False, default=str)

    prompt = ETHICS_GUARDIAN_PROMPT.format(report_summary=report_str)

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content="위 보고서의 윤리적 검토를 수행해 주세요."),
    ]

    try:
        response = await model.ainvoke(messages)
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
            'summary': '윤리 검토 시스템 오류로 보고서 전달이 차단되었습니다.',
        }

    state['ethics_review'] = result

    # BLOCK: if not approved, mark report as failed
    if not result.get('approved', False):
        logger.warning(
            "Ethics review BLOCKED report: %s",
            result.get('modifications_required', []),
        )
        state['ethics_blocked'] = True
    else:
        state['ethics_blocked'] = False

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
