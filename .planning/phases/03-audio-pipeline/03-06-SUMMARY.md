---
phase: "03-audio-pipeline"
plan: "06"
subsystem: "pattern-detection"
tags: ["patterns", "LLM-analysis", "trigger-phrases", "escalation", "weekly-summary", "celery-beat"]

requires:
  - "03-01 (Celery infrastructure, audio models, LLM service)"
  - "03-04 (unified conversation list, auto-conversation creation)"

provides:
  - "Pattern, InsightSummary, WeeklySummary models"
  - "LLM-based pattern detection (trigger phrases, recurring topics, escalation)"
  - "Weekly summary generation via Celery Beat"
  - "5 REST API endpoints at /api/v1/patterns/"
  - "Auto-chaining of pattern analysis after transcription and reframing"

affects:
  - "03-07 (insights UI consumes these endpoints)"
  - "04-partner-engagement (shared pattern visibility)"

tech-stack:
  added: []
  patterns:
    - "LLM-based analysis with Korean prompt (PATTERN_DETECTION_PROMPT)"
    - "Counter-based aggregation for dashboard stats"
    - "TruncWeek for weekly trend aggregation"
    - "update_or_create for idempotent InsightSummary"

key-files:
  created:
    - "backend/apps/patterns/__init__.py"
    - "backend/apps/patterns/apps.py"
    - "backend/apps/patterns/models.py"
    - "backend/apps/patterns/admin.py"
    - "backend/apps/patterns/services/__init__.py"
    - "backend/apps/patterns/services/detector.py"
    - "backend/apps/patterns/services/summarizer.py"
    - "backend/apps/patterns/tasks.py"
    - "backend/apps/patterns/serializers.py"
    - "backend/apps/patterns/views.py"
    - "backend/apps/patterns/urls.py"
    - "backend/apps/patterns/migrations/0001_initial.py"
  modified:
    - "backend/config/settings/base.py"
    - "backend/config/celery.py"
    - "backend/config/urls.py"
    - "backend/apps/audio/tasks.py"
    - "backend/apps/chat/views.py"

key-decisions:
  - decision: "Updated beat_schedule to point to patterns.tasks instead of audio.tasks placeholder"
    rationale: "Placeholder in 03-01 now replaced with real implementation"
  - decision: "Synchronous LLM calls in detector (not async)"
    rationale: "Runs inside Celery task which is already async; simpler code"
  - decision: "update_or_create for InsightSummary"
    rationale: "Re-analysis of same conversation updates existing summary"

duration: "6m"
completed: "2026-02-03"
---

# Phase 3 Plan 6: Pattern Detection Backend Summary

**LLM-based pattern detection with trigger phrases/recurring topics/escalation analysis, weekly summaries via Celery Beat, 5 REST API endpoints, auto-chained after transcription and reframing**

## Performance

| Metric | Value |
|--------|-------|
| Start | 2026-02-03T01:57:55+09:00 |
| End | 2026-02-03T02:03:52+09:00 |
| Duration | 6m |
| Tasks | 2/2 |

## Accomplishments

### Task 1: Pattern models + detection service + Celery tasks
- Created Pattern model with UUID PK, pattern_type choices (trigger_phrase/recurring_topic/escalation), content, category, severity (1-5), context_snippet
- Created InsightSummary model with OneToOne to Conversation, trigger_phrases/recurring_topics JSONFields, escalation_score (0-10), encrypted ai_summary
- Created WeeklySummary model with period dates, session_count, top_topics/trigger_frequency JSONFields, encrypted trend_text, escalation_trend enum
- Built LLM-based detector.py: detect_patterns() analyzes Korean text for absolutist language ("넌 항상", "넌 절대", "맨날"), conflict topics, escalation
- Built summarizer.py: generate_weekly_summary() aggregates patterns and generates natural language summary via LLM
- Created Celery tasks: analyze_patterns (per-session) and generate_weekly_summary_task (weekly beat)
- Updated beat_schedule to use patterns.tasks.generate_weekly_summary_task (Monday 9am KST)
- Registered patterns app in INSTALLED_APPS, admin, and ran migrations

### Task 2: Pattern API endpoints + wire analysis to pipelines
- Created serializers: PatternSerializer, InsightSummarySerializer, WeeklySummarySerializer, PatternStatsSerializer
- Built 5 API endpoints: pattern_list (GET, filterable), session_insights (GET by conversation), insights_dashboard (GET aggregated stats), weekly_summaries (GET paginated list), latest_weekly_summary (GET most recent)
- Dashboard endpoint provides: total sessions, top 5 categories, top 5 triggers, avg escalation, weekly trends
- Wired URLs to /api/v1/patterns/
- Chained analyze_patterns.delay() after audio transcription in audio/tasks.py
- Chained analyze_patterns.delay() after text reframing in chat/views.py

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 6c51d5a | Pattern models, detection service, Celery tasks |
| 2 | 3ef56ed | API endpoints, wired analysis to transcription and reframing |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Updated beat_schedule to patterns.tasks | Replaced 03-01 placeholder with real implementation |
| Synchronous LLM calls in detector | Runs inside Celery task; simpler than async |
| update_or_create for InsightSummary | Re-analysis updates existing summary idempotently |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None significant.

## Next Phase Readiness

### For 03-07 (Insights UI):
- All pattern endpoints available at /api/v1/patterns/
- Dashboard endpoint returns all data needed for insights screen
- Weekly summary endpoint ready for display

### Blockers:
- None

### Dependencies satisfied:
- Pattern detection auto-chains after both text and audio sessions
- Weekly summary generation scheduled via Celery Beat
- All 5 API endpoints accessible and verified
