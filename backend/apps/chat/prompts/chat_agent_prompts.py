"""System prompts for the therapeutic listener chat agent.

The chat agent listens and gathers information through empathetic conversation.
It does NOT analyze, suggest solutions, or provide reframing.
That is the role of the separate analysis system.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# Attachment style Korean labels (matches UserIntelligenceService._get_attachment_label)
_ATTACHMENT_LABELS = {
    '불안형': '불안형',
    '회피형': '회피형',
    '안정형': '안정형',
    '혼란형': '혼란형',
}

# Conflict style Korean labels
_CONFLICT_STYLE_LABELS = {
    'avoiding': '회피형',
    'competing': '경쟁형',
    'compromising': '타협형',
    'collaborating': '협력형',
    'accommodating': '수용형',
}

# Communication frequency Korean labels
_FREQUENCY_LABELS = {
    'daily': '매일',
    'several_weekly': '주 여러 번',
    'weekly': '주 1회',
    'biweekly': '격주',
    'monthly': '월 1회',
    'rarely': '거의 안 함',
}

THERAPEUTIC_LISTENER_PROMPT = """당신은 따뜻하고 전문적인 커플 관계 상담사입니다.

## 핵심 역할
사용자의 이야기를 경청하고, 공감하며, 자연스럽게 정보를 이끌어냅니다.
분석이나 해결책을 제시하지 않습니다. 당신의 역할은 듣고 이해하는 것입니다.

## 대화 단계별 지침

### 초기 (대화 시작)
- 따뜻한 인사와 공감으로 시작
- "오늘 어떤 이야기를 나눠볼까요?" 같은 개방형 질문
- 사용자가 편안함을 느끼도록 하는 것이 목표

### 탐색 (정보 수집)
- 구체적 상황을 부드럽게 탐색
- "그때 어떤 기분이 드셨어요?"
- "상대방은 어떤 반응이었나요?"
- 절대 캐묻지 말고, 자연스러운 대화 흐름 유지

### 심화 (부족한 정보 수집)
- 아직 파악하지 못한 부분을 자연스럽게 질문
- "이런 상황이 이전에도 있었나요?"
- "가장 바라시는 것은 무엇인가요?"

### 정리 (충분한 정보 수집 후)
- 지금까지 이해한 것을 요약
- "제가 이해한 바로는..." 으로 시작
- 사용자의 확인을 구함

## 현재 수집된 정보
{information_checklist_status}

## 수집이 필요한 정보
{missing_information}

## 규칙
- 분석, 패턴 해석, 해결책 제시 금지 (이것은 별도 분석 시스템의 역할)
- 누가 맞고 틀린지 판단 금지
- 사용자가 "분석해줘" 또는 "어떻게 해야 해?" 라고 하면:
  "조금 더 이야기를 나눠본 후에 정리해드릴게요" 로 자연스럽게 전환
- 한국어 격식체 사용
- 공감 우선, 질문은 부드럽게

## 출력 형식
반드시 유효한 JSON으로만 응답하세요:
{{"mode": "chat", "message": "자연스러운 한국어 대화 응답", "checklist_update": {{}}, "phase": "current_phase"}}"""


def build_personalized_prompt(
    base_prompt: str,
    user_context: dict | None,
    mode: str = 'reframing',
) -> str:
    """Append personalization sections to a base prompt.

    Adds a user profile section and a past-patterns section based on
    the context returned by UserIntelligenceService.get_ai_context().

    Sanitization (CC2): only category labels, counts, and Korean descriptors
    are injected -- never raw user text. Token budget: < 700 tokens.

    Args:
        base_prompt: The base system prompt string.
        user_context: Dict from UserIntelligenceService, or None.
        mode: 'reframing', 'comfort', or 'chat_agent'.

    Returns:
        The base prompt with personalization sections appended (or unchanged
        if user_context is None/empty).
    """
    if not user_context:
        return base_prompt

    sections: list[str] = []

    # --- User profile section ---
    profile_parts: list[str] = []

    attachment = user_context.get('attachment_style')
    if attachment:
        label = attachment.get('label', '')
        if label:
            profile_parts.append(f"- 애착 유형: {label}")

    conflict_style = user_context.get('conflict_style')
    if conflict_style:
        korean_label = _CONFLICT_STYLE_LABELS.get(conflict_style, conflict_style)
        profile_parts.append(f"- 갈등 대처 방식: {korean_label}")

    frequency = user_context.get('communication_frequency')
    if frequency:
        korean_label = _FREQUENCY_LABELS.get(frequency, frequency)
        profile_parts.append(f"- 소통 빈도: {korean_label}")

    goal = user_context.get('primary_goal')
    if goal:
        profile_parts.append(f"- 주요 목표: {goal}")

    focus_areas = user_context.get('focus_areas', [])
    if focus_areas:
        areas_str = ', '.join(focus_areas[:5])
        profile_parts.append(f"- 관심 영역: {areas_str}")

    if profile_parts:
        sections.append("## 사용자 프로필\n" + "\n".join(profile_parts))

    # --- Past patterns section ---
    patterns = user_context.get('recent_patterns')
    if patterns and mode != 'comfort':
        pattern_parts: list[str] = []

        from django.conf import settings as django_settings
        is_accumulative = getattr(django_settings, 'ACCUMULATIVE_THERAPY_ENABLED', False)

        top_topics = patterns.get('top_topics', [])
        if top_topics:
            topic_lines = [
                f"  - {t['topic']} ({t['count']}회)" for t in top_topics[:5]
            ]
            if is_accumulative:
                pattern_parts.append("- 탐색 참고 주제:\n" + "\n".join(topic_lines))
            else:
                pattern_parts.append("- 자주 나타나는 주제:\n" + "\n".join(topic_lines))

        triggers = patterns.get('top_trigger_categories', [])
        if triggers:
            triggers_str = ', '.join(triggers[:5])
            pattern_parts.append(f"- 민감한 영역: {triggers_str}")

        escalation = patterns.get('escalation_trend')
        if escalation:
            pattern_parts.append(f"- 갈등 추이: {escalation}")

        avg_score = patterns.get('avg_escalation_score')
        if avg_score is not None:
            pattern_parts.append(f"- 평균 갈등 강도: {avg_score}/10")

        if pattern_parts:
            sections.append("## 과거 패턴 참고\n" + "\n".join(pattern_parts))

    if not sections:
        return base_prompt

    return base_prompt + "\n\n" + "\n\n".join(sections)
