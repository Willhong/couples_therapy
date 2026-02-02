"""Weekly pattern summary generation service.

Aggregates pattern data over a period and generates a natural language
summary using LLM analysis.
"""

import logging
from collections import Counter
from datetime import date, timedelta

from django.db.models import Avg

from langchain_core.messages import HumanMessage, SystemMessage

from apps.chat.services.llm_service import get_chat_model

logger = logging.getLogger(__name__)


WEEKLY_SUMMARY_PROMPT = """당신은 부부 커뮤니케이션 패턴 요약 전문가입니다.

아래 주간 패턴 데이터를 바탕으로 짧고 따뜻한 주간 요약을 작성하세요.

## 작성 규칙
- 2-4문장으로 간결하게
- 중립적이고 격려하는 톤
- 구체적 수치를 포함 (세션 수, 주요 주제, 트리거 빈도)
- 지난주 대비 변화가 있으면 언급
- 한국어로 작성

## 예시
"이번 주에 3번의 대화가 있었어요. 재정 관련 주제가 가장 많았고, '넌 항상'이라는 표현이 2번 사용되었어요. 전반적으로 감정 강도는 지난주보다 안정적이에요."

## 데이터
"""


def generate_weekly_summary(user_id: str, period_start: date, period_end: date) -> dict:
    """Generate a weekly pattern summary for a user.

    Aggregates patterns from the given period and calls LLM
    to produce a natural language summary.

    Args:
        user_id: UUID string of the user.
        period_start: Start date of the period.
        period_end: End date of the period.

    Returns:
        dict with summary data including trend_text and aggregated stats.
    """
    from apps.patterns.models import Pattern, InsightSummary, WeeklySummary
    from apps.chat.models import Conversation

    # Gather patterns for this period
    patterns = Pattern.objects.filter(
        user_id=user_id,
        created_at__date__gte=period_start,
        created_at__date__lte=period_end,
    )

    # Count sessions
    conversation_ids = patterns.values_list('conversation_id', flat=True).distinct()
    session_count = conversation_ids.count()

    # Aggregate topics
    topic_patterns = patterns.filter(
        pattern_type=Pattern.PatternType.RECURRING_TOPIC,
    )
    topic_counter = Counter()
    for p in topic_patterns:
        topic_counter[p.category or p.content] += 1

    top_topics = [
        {'topic': topic, 'count': count}
        for topic, count in topic_counter.most_common(5)
    ]

    # Aggregate trigger phrases
    trigger_patterns = patterns.filter(
        pattern_type=Pattern.PatternType.TRIGGER_PHRASE,
    )
    trigger_counter = Counter()
    for p in trigger_patterns:
        trigger_counter[p.content] += 1

    trigger_frequency = dict(trigger_counter.most_common(10))

    # Calculate average escalation score
    avg_escalation = InsightSummary.objects.filter(
        user_id=user_id,
        created_at__date__gte=period_start,
        created_at__date__lte=period_end,
    ).aggregate(avg=Avg('escalation_score'))['avg'] or 0

    # Determine escalation trend by comparing to previous week
    prev_start = period_start - timedelta(days=7)
    prev_end = period_start - timedelta(days=1)
    prev_avg = InsightSummary.objects.filter(
        user_id=user_id,
        created_at__date__gte=prev_start,
        created_at__date__lte=prev_end,
    ).aggregate(avg=Avg('escalation_score'))['avg'] or 0

    if avg_escalation < prev_avg - 1:
        escalation_trend = 'improving'
    elif avg_escalation > prev_avg + 1:
        escalation_trend = 'worsening'
    else:
        escalation_trend = 'stable'

    # Generate natural language summary via LLM
    data_text = (
        f"기간: {period_start} ~ {period_end}\n"
        f"세션 수: {session_count}\n"
        f"주요 주제: {top_topics}\n"
        f"트리거 문구 빈도: {trigger_frequency}\n"
        f"평균 에스컬레이션 점수: {avg_escalation:.1f}/10\n"
        f"지난주 평균: {prev_avg:.1f}/10\n"
        f"추세: {escalation_trend}\n"
    )

    trend_text = ''
    try:
        model = get_chat_model(temperature=0.5, streaming=False)
        messages = [
            SystemMessage(content=WEEKLY_SUMMARY_PROMPT),
            HumanMessage(content=data_text),
        ]
        response = model.invoke(messages)
        trend_text = response.content.strip()
    except Exception as e:
        logger.exception(f"LLM weekly summary generation failed: {e}")
        trend_text = (
            f"이번 주에 {session_count}번의 대화가 있었어요. "
            f"에스컬레이션 추세는 '{escalation_trend}'입니다."
        )

    # Get user's couple
    from apps.couples.models import Couple
    from django.db.models import Q

    couple = Couple.objects.filter(
        Q(user1_id=user_id) | Q(user2_id=user_id),
        status=Couple.Status.ACTIVE,
    ).first()

    # Create WeeklySummary record
    summary = WeeklySummary.objects.create(
        user_id=user_id,
        couple=couple,
        period_start=period_start,
        period_end=period_end,
        session_count=session_count,
        top_topics=top_topics,
        trigger_frequency=trigger_frequency,
        trend_text=trend_text,
        escalation_trend=escalation_trend,
    )

    logger.info(
        f"Weekly summary generated for user {user_id}: "
        f"{session_count} sessions, trend={escalation_trend}"
    )

    return {
        'id': str(summary.id),
        'period_start': str(period_start),
        'period_end': str(period_end),
        'session_count': session_count,
        'top_topics': top_topics,
        'trigger_frequency': trigger_frequency,
        'trend_text': trend_text,
        'escalation_trend': escalation_trend,
    }
