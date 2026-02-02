"""LLM-based communication pattern detection service.

Analyzes conversations for trigger phrases, recurring topics,
and escalation patterns using LLM analysis of Korean text.
"""

import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from apps.chat.services.llm_service import get_chat_model

logger = logging.getLogger(__name__)


PATTERN_DETECTION_PROMPT = """당신은 부부 갈등 패턴 분석가입니다. 아래 대화 내용을 분석하세요.

## 분석 항목
1. **트리거 문구**: 절대적 표현 ("넌 항상", "넌 절대", "맨날 그래"), 비난 표현 ("왜 그런 식으로"), 일반화 표현
2. **갈등 주제**: 주요 갈등 주제를 카테고리로 분류 (돈/재정, 가사, 시간, 의사소통, 가족, 육아, 기타)
3. **에스컬레이션**: 대화가 진행되면서 감정 강도가 어떻게 변하는지 (0-10 점수)

## 응답 형식 (JSON)
{
  "trigger_phrases": [{"text": "감지된 문구", "context": "주변 맥락 1-2문장"}],
  "topics": [{"name": "주제 이름", "category": "카테고리"}],
  "escalation_score": 0,
  "summary": "이 대화의 핵심 패턴 요약 (2-3문장, 중립적 관찰 톤)"
}

## 톤
- 중립적이고 관찰적인 톤 유지
- 판단이나 비난 없이 사실 기반 분석
- 한국어로 응답
"""


def _parse_json_response(response: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""
    response = response.strip()

    # Remove markdown code blocks
    code_block_pattern = r'```(?:json|JSON)?\s*\n?(.*?)\n?```'
    match = re.search(code_block_pattern, response, re.DOTALL)
    if match:
        response = match.group(1).strip()

    # Find JSON object
    start = response.find('{')
    end = response.rfind('}')

    if start != -1 and end != -1 and end > start:
        json_str = response[start:end + 1]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse JSON response: {response[:200]}...")
        return {}


def detect_patterns(conversation_id: str) -> dict:
    """Detect communication patterns in a conversation.

    Loads messages or transcript segments and analyzes them via LLM
    for trigger phrases, recurring topics, and escalation patterns.

    Args:
        conversation_id: UUID string of the conversation to analyze.

    Returns:
        dict with trigger_phrases, topics, escalation_score, summary.
    """
    from apps.chat.models import Conversation, Message
    from apps.audio.models import AudioRecording, TranscriptSegment
    from apps.patterns.models import Pattern, InsightSummary

    try:
        conversation = Conversation.objects.get(id=conversation_id)
    except Conversation.DoesNotExist:
        logger.error(f"Conversation {conversation_id} not found")
        return {}

    # Gather text content based on conversation type
    text_blocks = []

    if conversation.conversation_type == Conversation.ConversationType.TEXT:
        # Text chat: load messages
        messages = Message.objects.filter(
            conversation=conversation,
            role__in=[Message.Role.USER, Message.Role.ASSISTANT],
        ).order_by('created_at')

        for msg in messages:
            role_label = '사용자' if msg.role == Message.Role.USER else 'AI'
            text_blocks.append(f"{role_label}: {msg.content}")
    else:
        # Audio: load transcript segments
        recordings = AudioRecording.objects.filter(
            conversation=conversation,
            status=AudioRecording.Status.COMPLETED,
        )
        for recording in recordings:
            segments = TranscriptSegment.objects.filter(
                recording=recording
            ).order_by('order')
            for seg in segments:
                speaker = seg.speaker_label or seg.speaker
                text_blocks.append(f"{speaker}: {seg.text}")

    if not text_blocks:
        logger.info(f"No content to analyze for conversation {conversation_id}")
        return {}

    full_text = "\n".join(text_blocks)

    # Call LLM for analysis
    try:
        model = get_chat_model(temperature=0.3, streaming=False)
        messages = [
            SystemMessage(content=PATTERN_DETECTION_PROMPT),
            HumanMessage(content=f"## 대화 내용\n{full_text}"),
        ]
        response = model.invoke(messages)
        result = _parse_json_response(response.content)
    except Exception as e:
        logger.exception(f"LLM pattern detection failed for {conversation_id}: {e}")
        return {}

    if not result:
        return {}

    # Save Pattern records for trigger phrases
    trigger_phrases = result.get('trigger_phrases', [])
    for tp in trigger_phrases:
        Pattern.objects.create(
            user=conversation.user,
            couple=conversation.couple,
            conversation=conversation,
            pattern_type=Pattern.PatternType.TRIGGER_PHRASE,
            content=tp.get('text', ''),
            context_snippet=tp.get('context', ''),
            severity=min(max(len(trigger_phrases), 1), 5),
        )

    # Save Pattern records for topics
    topics = result.get('topics', [])
    for topic in topics:
        # Check for recurring topics
        recurring = find_recurring_topics(
            str(conversation.user_id),
            [topic],
        )
        severity = min(max(len(recurring) + 1, 1), 5)

        Pattern.objects.create(
            user=conversation.user,
            couple=conversation.couple,
            conversation=conversation,
            pattern_type=Pattern.PatternType.RECURRING_TOPIC,
            content=topic.get('name', ''),
            category=topic.get('category', ''),
            severity=severity,
        )

    # Save escalation pattern if score is notable
    escalation_score = result.get('escalation_score', 0)
    if escalation_score >= 3:
        Pattern.objects.create(
            user=conversation.user,
            couple=conversation.couple,
            conversation=conversation,
            pattern_type=Pattern.PatternType.ESCALATION,
            content=f"에스컬레이션 점수: {escalation_score}/10",
            severity=min(max(escalation_score // 2, 1), 5),
        )

    # Create or update InsightSummary
    InsightSummary.objects.update_or_create(
        conversation=conversation,
        defaults={
            'user': conversation.user,
            'trigger_phrases': trigger_phrases,
            'recurring_topics': find_recurring_topics(
                str(conversation.user_id),
                topics,
            ),
            'escalation_score': escalation_score,
            'ai_summary': result.get('summary', ''),
        },
    )

    logger.info(
        f"Pattern detection completed for {conversation_id}: "
        f"{len(trigger_phrases)} triggers, {len(topics)} topics, "
        f"escalation={escalation_score}"
    )

    return result


def find_recurring_topics(user_id: str, new_topics: list) -> list:
    """Cross-reference new topics against user's historical patterns.

    Args:
        user_id: UUID string of the user.
        new_topics: List of {name, category} dicts from current analysis.

    Returns:
        List of matches with count, e.g. [{"topic": "돈 문제", "category": "finance", "count": 4}]
    """
    from apps.patterns.models import Pattern

    matches = []
    for topic in new_topics:
        category = topic.get('category', '')
        if not category:
            continue

        # Count previous patterns with same category
        count = Pattern.objects.filter(
            user_id=user_id,
            pattern_type=Pattern.PatternType.RECURRING_TOPIC,
            category=category,
        ).count()

        if count > 0:
            matches.append({
                'topic': topic.get('name', ''),
                'category': category,
                'count': count,
            })

    return matches
