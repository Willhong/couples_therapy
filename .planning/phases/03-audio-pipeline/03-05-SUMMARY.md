---
phase: 03-audio-pipeline
plan: "05"
subsystem: live-recording
tags: [websocket, consent-flow, live-recording, partner-indicator, expo-av, dual-consent]

requires:
  - "01-04 (WebSocket consent infrastructure, useRecordingConsent hook)"
  - "03-01 (backend audio API, transcription pipeline)"
  - "03-02 (useAudioRecording hook, RecordingScreen, waveform, audioApi service)"
  - "03-03 (transcript display, mode-aware routing)"

provides:
  - "useLiveRecording hook for consent -> record -> upload lifecycle"
  - "LiveConsentFlow component with full UI state machine"
  - "PartnerRecordingIndicator overlay for partner device"
  - "Enabled live recording mode in RecordingScreen"
  - "WebSocket message types: recording_started, stop_recording, recording_stopped"
  - "Thorough consent validation in upload_audio (status, expiry, authorization)"

affects:
  - "03-06 (pattern detection on live recordings)"
  - "04-partner-engagement (partner receives indicator, shared transcripts)"

tech-stack:
  added: []
  patterns:
    - "WebSocket recording lifecycle synchronization"
    - "Phase-based consent state machine (requesting -> waiting -> granted/declined)"
    - "Auto-start recording on consent grant"
    - "Narration fallback after consent decline"
    - "Thorough consent validation (3-layer: status, expiry, authorization)"

key-files:
  created:
    - mobile/src/features/recording/hooks/useLiveRecording.ts
    - mobile/src/features/recording/components/LiveConsentFlow.tsx
    - mobile/src/features/recording/components/PartnerRecordingIndicator.tsx
  modified:
    - mobile/src/features/recording/components/RecordingScreen.tsx
    - mobile/src/features/recording/index.ts
    - backend/apps/consents/consumers.py
    - backend/apps/audio/views.py

key-decisions:
  - decision: "Reuse existing useRecordingConsent hook for consent WebSocket"
    rationale: "Consent channel pattern already established in Phase 1; useLiveRecording wraps it"
  - decision: "Auto-start recording 500ms after consent granted"
    rationale: "Brief visual confirmation before seamless transition to recording"
  - decision: "Narration fallback offered after consent decline"
    rationale: "User should not be stuck; can continue alone if partner declines"
  - decision: "3-layer consent validation in upload_audio"
    rationale: "Defense in depth: check existence, status, expiry, and user authorization"

duration: "8m"
completed: "2026-02-03"
---

# Phase 3 Plan 05: Live Conflict Recording Summary

**One-liner:** Live recording with WebSocket consent flow, partner indicator overlay, recording lifecycle sync, and thorough backend consent validation

## Performance

| Metric | Value |
|--------|-------|
| Start | 2026-02-03T01:56:08+09:00 |
| End | 2026-02-03T02:04:32+09:00 |
| Duration | 8m |
| Tasks | 2/2 |

## Accomplishments

### Task 1: Live consent flow component + live recording hook + partner indicator

- **useLiveRecording hook**: Manages full lifecycle (requesting_consent -> waiting_consent -> consent_granted/declined -> recording -> stopped). Wraps useRecordingConsent for WebSocket and useAudioRecording for expo-av. 5-minute consent timeout. Returns phase, controls, metering data, consent session ID.
- **LiveConsentFlow component**: Full UI state machine with requesting screen (partner online check), waiting spinner, granted auto-proceed, declined with narration fallback, recording with waveform and controls, upload/processing phases. Red "녹음 중 - 파트너와 함께" indicator bar.
- **PartnerRecordingIndicator component**: SafeAreaView overlay in dark red with pulsing dot, partner name, elapsed timer (MM:SS), large stop button, and hint text. Shown on partner's device during active recording.
- Updated barrel exports in index.ts with all new components and hooks.

### Task 2: Integrate live mode + backend WebSocket stop handling + consent validation

- **RecordingScreen**: Enabled live mode card (removed disabled/coming soon badge), added `live_consent` phase, renders LiveConsentFlow when selected, handles narration fallback and cancel.
- **ConsentConsumer WebSocket**: Added 3 new action handlers (recording_started, stop_recording, recording_stopped) with group broadcast, plus 3 matching event relay handlers for client-facing messages.
- **upload_audio consent validation**: 3-layer defense - (1) consent exists, (2) status is BOTH_CONSENTED, (3) not expired, (4) uploader is requester or responder. Added timezone import for expiry check.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 44524d2 | Live consent flow + live recording hook + partner indicator |
| 2 | 3ef56ed | Integrated into RecordingScreen + backend stop handling + consent validation (absorbed by 03-06 commit) |

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| mobile/src/features/recording/hooks/useLiveRecording.ts | Live recording lifecycle hook with consent + recording | 161 |
| mobile/src/features/recording/components/LiveConsentFlow.tsx | Full consent + recording UI state machine | 296 |
| mobile/src/features/recording/components/PartnerRecordingIndicator.tsx | Partner-side recording overlay with stop | 152 |

## Files Modified

| File | Change |
|------|--------|
| mobile/src/features/recording/components/RecordingScreen.tsx | Enabled live mode, added live_consent phase + LiveConsentFlow rendering |
| mobile/src/features/recording/index.ts | Added barrel exports for LiveConsentFlow, PartnerRecordingIndicator, useLiveRecording |
| backend/apps/consents/consumers.py | Added recording_started/stop_recording/recording_stopped WebSocket handlers |
| backend/apps/audio/views.py | Thorough 3-layer consent validation for live uploads |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Reuse useRecordingConsent hook in useLiveRecording | Consent WebSocket channel already established in Phase 1 |
| Auto-start recording 500ms after consent | Brief visual confirmation then seamless transition |
| Narration fallback after consent decline | User not stuck if partner declines |
| 3-layer consent validation in upload_audio | Defense in depth: existence, status, expiry, authorization |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 2 changes absorbed by 03-06 commit**
- **Found during:** Task 2 commit
- **Issue:** A parallel session (03-06) committed changes to the same files (RecordingScreen.tsx, consumers.py, views.py) that included our Task 2 modifications
- **Fix:** Verified all Task 2 changes are present and working in HEAD; TypeScript and Django checks pass
- **Files affected:** RecordingScreen.tsx, consumers.py, views.py
- **Commit:** 3ef56ed (03-06 commit includes our changes)

## Issues Encountered

None functional. Task 2 code was already committed by a parallel session.

## Next Phase Readiness

### For 03-06 (Pattern Detection):
- Live recordings now have proper consent validation
- WebSocket lifecycle messages enable real-time sync between partners
- Upload flow passes consent_session_id for audit trail

### For 04 (Partner Engagement):
- PartnerRecordingIndicator ready for integration in partner's app view
- WebSocket recording_started/recording_stopped events enable partner-side UI
- Live mode fully enabled in RecordingScreen

### Blockers:
- None
