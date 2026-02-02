---
phase: "03-audio-pipeline"
plan: "01"
subsystem: "backend-audio"
tags: ["celery", "openai-transcription", "audio-models", "comfort-mode", "async-tasks"]

requires:
  - "01-foundation (Django config, auth, models)"
  - "02-core-reframing (chat models, reframing pipeline, LLM service)"

provides:
  - "Celery async task infrastructure with Redis broker"
  - "AudioRecording, TranscriptSegment, TranscriptEdit models"
  - "OpenAI transcription service (gpt-4o-transcribe)"
  - "Audio upload/status/transcript/edit API endpoints"
  - "Comfort mode pipeline and endpoint"

affects:
  - "03-02 (recording UI needs these endpoints)"
  - "03-03+ (future audio pipeline plans build on this)"
  - "04-partner-engagement (shared recordings)"

tech-stack:
  added:
    - "celery>=5.4.0"
    - "django-celery-beat>=2.5.0"
    - "openai>=1.50.0"
  patterns:
    - "Celery shared_task for async processing"
    - "Redis broker (db 1, separate from channels db 0)"
    - "FileField with auto-cleanup for privacy"
    - "EncryptedTextField for transcript content"
    - "Beat schedule for periodic tasks"

key-files:
  created:
    - "backend/config/celery.py"
    - "backend/apps/audio/__init__.py"
    - "backend/apps/audio/apps.py"
    - "backend/apps/audio/models.py"
    - "backend/apps/audio/admin.py"
    - "backend/apps/audio/serializers.py"
    - "backend/apps/audio/views.py"
    - "backend/apps/audio/urls.py"
    - "backend/apps/audio/tasks.py"
    - "backend/apps/audio/services/__init__.py"
    - "backend/apps/audio/services/transcription.py"
    - "backend/apps/audio/migrations/0001_initial.py"
  modified:
    - "backend/config/__init__.py"
    - "backend/config/settings/base.py"
    - "backend/config/urls.py"
    - "backend/requirements.txt"
    - "backend/apps/chat/prompts/system_prompts.py"
    - "backend/apps/chat/services/reframing_graph.py"
    - "backend/apps/chat/views.py"
    - "backend/apps/chat/urls.py"

key-decisions:
  - decision: "Redis db 1 for Celery (db 0 for channels)"
    rationale: "Separate broker from channel layer to avoid conflicts"
  - decision: "OpenAI direct API for transcription (not OpenRouter)"
    rationale: "Transcription API is OpenAI-specific, not available via OpenRouter"
  - decision: "gpt-4o-transcribe model with verbose_json response"
    rationale: "Latest OpenAI transcription model with Korean support"
  - decision: "Always delete audio file after transcription"
    rationale: "Privacy - no raw audio stored on server after processing"
  - decision: "Comfort mode as separate pipeline (not LLM mode choice)"
    rationale: "User explicitly chooses comfort vs reframe, not LLM decision"

duration: "9m"
completed: "2026-02-03"
---

# Phase 3 Plan 1: Backend Audio Infrastructure Summary

**Celery async task queue + audio models + transcription service + upload/status/transcript endpoints + comfort mode pipeline**

## Performance

| Metric | Value |
|--------|-------|
| Start | 2026-02-03T01:32:19+09:00 |
| End | 2026-02-03T01:40:52+09:00 |
| Duration | 9m |
| Tasks | 2/2 |

## Accomplishments

### Task 1: Celery Infrastructure + Audio App Models
- Configured Celery with Redis broker (db 1) and weekly beat schedule
- Created AudioRecording model with UUID PK, encrypted full_text, status tracking, auto file cleanup
- Created TranscriptSegment model with speaker labels, timestamps, encrypted text
- Created TranscriptEdit model for user correction audit trail
- Added django-celery-beat, openai, celery to requirements
- Added MEDIA_ROOT, OPENAI_API_KEY, MAX_AUDIO_FILE_SIZE settings
- Registered audio app in INSTALLED_APPS and admin

### Task 2: Transcription Service + API Endpoints + Comfort Mode
- Created OpenAI transcription service (transcribe_narration + transcribe_with_diarization)
- Created async Celery task with retry logic and guaranteed audio file cleanup
- Built 7 audio API endpoints: upload, status, transcript, segment edit, speaker assign, post-action, delete
- Upload validates file size (25MB max) and consent for live recordings
- Added COMFORT_MODE_PROMPT for empathetic responses without reframing
- Added run_comfort_pipeline to reframing_graph service
- Added comfort_message view and URL to chat app
- Wired audio URLs to /api/v1/audio/ in config

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 9046e09 | Celery infrastructure and audio app models |
| 2 | 3cb64dc | Transcription service, API endpoints, comfort mode (included in parallel 03-02 commit) |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Redis db 1 for Celery | Separate from channels layer (db 0) |
| OpenAI direct API for transcription | Transcription not available via OpenRouter |
| gpt-4o-transcribe model | Latest OpenAI model with Korean language support |
| Always delete audio after transcription | Privacy - raw audio never persisted |
| Comfort mode as explicit user choice | Not LLM mode selection, user picks comfort vs reframe |

## Deviations from Plan

None - plan executed exactly as written.

**Note:** Task 2 files were committed as part of a parallel 03-02 agent execution (commit 3cb64dc). The code is identical to what was specified in this plan. This is a timing artifact of parallel plan execution.

## Issues Encountered

- None significant. Minor: Django fernet_fields requires DJANGO_SETTINGS_MODULE to be set for standalone imports.

## Next Phase Readiness

### For 03-02 (Recording UI):
- All backend endpoints available at /api/v1/audio/
- Upload returns recording_id for status polling
- Comfort mode endpoint at /api/v1/chat/comfort/

### Blockers:
- None

### Dependencies satisfied:
- AudioRecording + TranscriptSegment models migrated
- Celery configured with Redis broker
- Upload/status/transcript endpoints working
- Comfort mode pipeline available
