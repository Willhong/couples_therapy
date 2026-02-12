"""LangGraph-based multi-agent analysis pipeline.

Orchestrates 5 analysis agents + 1 ethics guardian + 1 report synthesizer
to produce therapy insight reports from accumulated user data.

Graph flow:
  collect_data -> [pattern_analyst + emotion_interpreter] (in parallel node)
              -> balance_mediator
              -> resolution_strategist
              -> report_synthesizer
              -> ethics_guardian
              -> (conditional) save_report | mark_blocked
              -> END
"""

import json
import logging
from typing import Any, TypedDict

from django.conf import settings
from langgraph.graph import END, StateGraph

logger = logging.getLogger(__name__)


class AnalysisState(TypedDict, total=False):
    """State passed through the analysis graph."""

    # Input
    report_id: str
    user_id: str
    couple_id: int | None
    trigger_tier: str
    trigger_reason: str
    lookback_days: int

    # Data
    therapy_context: dict

    # Agent outputs
    pattern_analysis: dict
    emotion_analysis: dict
    balance_analysis: dict
    resolution_suggestions: dict

    # Report
    report_title: str
    report_summary: str
    key_insights: list
    suggested_actions: list
    recommended_activities: list

    # Ethics
    ethics_review: dict
    ethics_blocked: bool

    # Error
    error: str | None


def _get_agent_model(agent_name: str):
    """Get configured LLM for a specific agent."""
    from apps.chat.services.llm_service import get_chat_model

    config = settings.ANALYSIS_AGENT_CONFIG.get(agent_name, {})
    return get_chat_model(
        temperature=config.get('temperature', 0.5),
        max_tokens=config.get('max_tokens', 1024),
        streaming=False,
    )


# ── Node wrappers ──────────────────────────────────────────────────

def collect_data_node(state: AnalysisState) -> dict:
    """Collect therapy context from all data sources."""
    from .data_collector import TherapyDataCollector

    collector = TherapyDataCollector(state['user_id'])
    context = collector.collect_therapy_context(
        lookback_days=state.get('lookback_days', 14),
    )
    return {'therapy_context': context}


def parallel_analysis_node(state: AnalysisState) -> dict:
    """Run pattern + emotion analysis sequentially (sync-safe).

    LangGraph sync invoke doesn't support asyncio, so we run
    both analyses in sequence. The overhead is acceptable since
    each is a single LLM call.
    """
    from .agents.pattern_analyst import pattern_node
    from .agents.emotion_interpreter import emotion_node

    pattern_model = _get_agent_model('pattern_analyst')
    emotion_model = _get_agent_model('emotion_interpreter')

    result = {}
    result.update(pattern_node(state, pattern_model))
    result.update(emotion_node(state, emotion_model))
    return result


def balance_mediator_wrapper(state: AnalysisState) -> dict:
    from .agents.balance_mediator import balance_node
    model = _get_agent_model('balance_mediator')
    return balance_node(state, model)


def resolution_strategist_wrapper(state: AnalysisState) -> dict:
    from .agents.resolution_strategist import resolution_node
    model = _get_agent_model('resolution_strategist')
    return resolution_node(state, model)


def report_synthesizer_wrapper(state: AnalysisState) -> dict:
    from .agents.report_synthesizer import synthesizer_node
    model = _get_agent_model('report_synthesizer')
    return synthesizer_node(state, model)


def ethics_guardian_wrapper(state: AnalysisState) -> dict:
    from .agents.ethics_guardian import ethics_node, EthicsBlockError
    model = _get_agent_model('ethics_guardian')
    try:
        result = ethics_node(state, model)
        return {**result, 'ethics_blocked': False}
    except EthicsBlockError as e:
        logger.warning("Ethics guardian blocked report: %s", e)
        return {
            'ethics_review': {'approved': False, 'reason': str(e)},
            'ethics_blocked': True,
        }


def save_report_node(state: AnalysisState) -> dict:
    """Persist analysis results to existing InsightReport."""
    from apps.intelligence.models import InsightReport

    report_id = state.get('report_id')
    if not report_id:
        logger.error("No report_id in state, cannot save")
        return {}

    try:
        report = InsightReport.objects.get(pk=report_id)
        report.pattern_analysis = json.dumps(
            state.get('pattern_analysis', {}), ensure_ascii=False,
        )
        report.emotion_analysis = json.dumps(
            state.get('emotion_analysis', {}), ensure_ascii=False,
        )
        report.balance_analysis = json.dumps(
            state.get('balance_analysis', {}), ensure_ascii=False,
        )
        report.resolution_suggestions = json.dumps(
            state.get('resolution_suggestions', {}), ensure_ascii=False,
        )
        report.ethics_review = state.get('ethics_review', {})
        report.report_title = state.get('report_title', '인사이트 보고서')
        report.report_summary = state.get('report_summary', '')
        report.key_insights = state.get('key_insights', [])
        report.suggested_actions = state.get('suggested_actions', [])
        report.recommended_activities = state.get('recommended_activities', [])
        report.status = 'completed'
        report.save()
        logger.info("InsightReport %s saved successfully", report_id)
    except InsightReport.DoesNotExist:
        logger.error("InsightReport %s not found", report_id)
    except Exception:
        logger.exception("Failed to save InsightReport %s", report_id)

    return {}


def mark_blocked_node(state: AnalysisState) -> dict:
    """Mark report as failed when ethics blocks it."""
    from apps.intelligence.models import InsightReport

    report_id = state.get('report_id')
    if not report_id:
        return {}

    try:
        InsightReport.objects.filter(pk=report_id).update(
            status='failed',
            ethics_review=state.get('ethics_review', {}),
        )
        logger.warning("InsightReport %s blocked by ethics guardian", report_id)
    except Exception:
        logger.exception("Failed to mark InsightReport %s as blocked", report_id)

    return {}


# ── Conditional routing ────────────────────────────────────────────

def should_save(state: AnalysisState) -> str:
    """Route based on ethics review result."""
    if state.get('ethics_blocked', False):
        return 'blocked'
    return 'save'


# ── Graph construction ─────────────────────────────────────────────

def build_analysis_graph() -> StateGraph:
    """Build the multi-agent analysis StateGraph."""
    graph = StateGraph(AnalysisState)

    graph.add_node('collect_data', collect_data_node)
    graph.add_node('parallel_analysis', parallel_analysis_node)
    graph.add_node('balance_mediator', balance_mediator_wrapper)
    graph.add_node('resolution_strategist', resolution_strategist_wrapper)
    graph.add_node('report_synthesizer', report_synthesizer_wrapper)
    graph.add_node('ethics_guardian', ethics_guardian_wrapper)
    graph.add_node('save_report', save_report_node)
    graph.add_node('mark_blocked', mark_blocked_node)

    graph.set_entry_point('collect_data')
    graph.add_edge('collect_data', 'parallel_analysis')
    graph.add_edge('parallel_analysis', 'balance_mediator')
    graph.add_edge('balance_mediator', 'resolution_strategist')
    graph.add_edge('resolution_strategist', 'report_synthesizer')
    graph.add_edge('report_synthesizer', 'ethics_guardian')

    # Conditional: ethics -> save or blocked
    graph.add_conditional_edges(
        'ethics_guardian',
        should_save,
        {'save': 'save_report', 'blocked': 'mark_blocked'},
    )

    graph.add_edge('save_report', END)
    graph.add_edge('mark_blocked', END)

    return graph


# Lazy compilation (avoid import-time side effects)
_compiled_graph = None


def _get_compiled_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_analysis_graph().compile()
    return _compiled_graph


def run_analysis(report_id: str, user_id: str, couple_id: int | None,
                 trigger_tier: str, trigger_reason: str,
                 lookback_days: int = 14) -> dict:
    """Execute the full analysis pipeline (synchronous).

    Called from Celery tasks. Updates the existing InsightReport.

    Args:
        report_id: UUID of the InsightReport to populate.
        user_id: User ID to analyze.
        couple_id: Optional couple ID.
        trigger_tier: critical/threshold/sufficiency/periodic.
        trigger_reason: Human-readable reason.
        lookback_days: Data lookback period.

    Returns:
        Final state dict from the graph.
    """
    graph = _get_compiled_graph()

    initial_state: AnalysisState = {
        'report_id': report_id,
        'user_id': str(user_id),
        'couple_id': couple_id,
        'trigger_tier': trigger_tier,
        'trigger_reason': trigger_reason,
        'lookback_days': lookback_days,
    }

    try:
        result = graph.invoke(initial_state)
        logger.info("Analysis pipeline completed for report %s", report_id)
        return result
    except Exception:
        logger.exception("Analysis pipeline failed for report %s", report_id)
        from apps.intelligence.models import InsightReport
        try:
            InsightReport.objects.filter(pk=report_id).update(status='failed')
        except Exception:
            pass
        raise
