---
phase: 03-audio-pipeline
plan: "03"
subsystem: mobile-transcript
tags: [transcript-view, chat-bubbles, speaker-assignment, audio-player, post-actions, mode-routing]

requires:
  - "03-01 (backend audio API, transcript endpoints)"
  - "03-02 (recording types, audioApi service, RecordingScreen)"

provides:
  - "Transcript feature module with hooks, components, barrel export"
  - "Chat-bubble style TranscriptView with audio seek-to-line"
  - "SpeakerAssignment modal for diarized live recordings"
  - "PostTranscriptActions (reframe/comfort/keep) in standalone and inline modes"
  - "Mode-aware routing: narration->choice screen, live->transcript view"
  - "Transcript detail route page at /transcript/{id}"
  - "Post-recording choice screen at /post-recording-choice"

affects:
  - "03-04+ (future transcript-related features)"
  - "03-05 (live recording consent flow extends this routing)"
  - "04-partner-engagement (shared transcript viewing)"

tech-stack:
  added: []
  patterns:
    - "onTranscriptionComplete callback for decoupled mode-aware routing"
    - "FlatList transcript with audio position tracking"
    - "Modal-based inline editing and speaker assignment"
    - "Dual-mode PostTranscriptActions (standalone cards vs inline row)"

key-files:
  created:
    - mobile/src/features/transcript/types.ts
    - mobile/src/features/transcript/hooks/useTranscript.ts
    - mobile/src/features/transcript/hooks/useAudioPlayer.ts
    - mobile/src/features/transcript/components/TranscriptLine.tsx
    - mobile/src/features/transcript/components/AudioPlayer.tsx
    - mobile/src/features/transcript/components/TranscriptView.tsx
    - mobile/src/features/transcript/components/SpeakerAssignment.tsx
    - mobile/src/features/transcript/components/PostTranscriptActions.tsx
    - mobile/src/features/transcript/index.ts
    - mobile/src/app/(main)/transcript/[id].tsx
    - mobile/src/app/(main)/post-recording-choice.tsx
  modified:
    - mobile/src/app/(main)/record.tsx
    - mobile/src/app/(main)/_layout.tsx
    - mobile/src/features/recording/components/RecordingScreen.tsx

key-decisions:
  - decision: "onTranscriptionComplete callback pattern"
    rationale: "Decouples RecordingScreen from routing; record.tsx handles mode-aware navigation"
  - decision: "Hidden tab screens for transcript and post-recording-choice"
    rationale: "Routes accessible via navigation but not shown in tab bar"
  - decision: "Speaker assignment auto-shown on first load for live recordings only"
    rationale: "Narration has single speaker; live needs user to label who is who"
  - decision: "Emotion intensity as left border color on transcript bubbles"
    rationale: "Subtle visual cue without overwhelming the text content"

duration: "8m"
completed: "2026-02-03"
---

# Phase 3 Plan 3: Transcript Display & Interaction Summary

**One-liner:** Chat-bubble transcript view with audio player seek-to-line, speaker assignment modal, inline editing, PostTranscriptActions (reframe/comfort/keep), and mode-aware routing (narration->choice screen, live->transcript view)

## Performance

| Metric | Value |
|--------|-------|
| Start | 2026-02-03T01:44:48+09:00 |
| End | 2026-02-03T01:53:04+09:00 |
| Duration | 8m |
| Tasks | 2/2 |

## Accomplishments

### Task 1: Transcript hooks + audio player + transcript line components
- Created transcript types re-exporting TranscriptSegment from recording module + SpeakerMap, TranscriptState, AudioPlayerState
- Built useTranscript hook: loads transcript via getTranscript, detects recording type from speaker count, manages edit/speaker/action operations
- Built useAudioPlayer hook: expo-av Sound API with play/pause/seekTo/jumpToTime, handles load/unload lifecycle, playback status tracking
- Created TranscriptLine: chat-bubble with speaker label, emotion intensity left border, playing highlight, press-to-seek and long-press-to-edit
- Created AudioPlayer: horizontal bar with play/pause toggle, seekable Slider, time display, "audio unavailable" fallback
- Created barrel export index.ts

### Task 2: Transcript view, speaker assignment, post-actions with mode-aware routing
- Built TranscriptView: AudioPlayer at top, FlatList of TranscriptLines, edit modal on long-press, speaker assignment on first load for live, inline PostTranscriptActions at bottom for live recordings
- Built SpeakerAssignment modal: maps speaker codes to names, pre-filled "나" and "파트너", confirm/skip buttons
- Built PostTranscriptActions: dual-mode component (standalone full cards for choice screen, inline compact row for transcript bottom), reframe (purple), comfort (amber), keep (gray) with loading states
- Created transcript/[id] route page with back navigation header
- Created post-recording-choice screen: success icon + title + standalone PostTranscriptActions + "전사 결과 보기" link
- Updated RecordingScreen with onTranscriptionComplete callback prop
- Updated record.tsx with mode-aware routing: narration->post-recording-choice, live->transcript/[id]
- Updated _layout.tsx to hide transcript/[id] and post-recording-choice from tab bar

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c8946d6 | Transcript hooks, audio player, and transcript line components |
| 2 | 23d83cb | Transcript view, speaker assignment, post-actions with mode-aware routing |

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| mobile/src/features/transcript/types.ts | Type definitions re-exporting + SpeakerMap | 26 |
| mobile/src/features/transcript/hooks/useTranscript.ts | Transcript data loading and management hook | 120 |
| mobile/src/features/transcript/hooks/useAudioPlayer.ts | expo-av audio playback hook | 107 |
| mobile/src/features/transcript/components/TranscriptLine.tsx | Chat-bubble transcript segment | 152 |
| mobile/src/features/transcript/components/AudioPlayer.tsx | Seekable audio player bar | 117 |
| mobile/src/features/transcript/components/TranscriptView.tsx | Main transcript display with modals | 275 |
| mobile/src/features/transcript/components/SpeakerAssignment.tsx | Speaker name mapping modal | 149 |
| mobile/src/features/transcript/components/PostTranscriptActions.tsx | Reframe/comfort/keep action buttons | 194 |
| mobile/src/features/transcript/index.ts | Barrel exports | 20 |
| mobile/src/app/(main)/transcript/[id].tsx | Transcript detail route page | 82 |
| mobile/src/app/(main)/post-recording-choice.tsx | Self-narration choice screen | 124 |

## Files Modified

| File | Change |
|------|--------|
| mobile/src/app/(main)/record.tsx | Replaced placeholder with RecordingScreen + mode-aware routing callback |
| mobile/src/app/(main)/_layout.tsx | Added hidden tab screens for transcript/[id] and post-recording-choice |
| mobile/src/features/recording/components/RecordingScreen.tsx | Added onTranscriptionComplete callback prop |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| onTranscriptionComplete callback pattern | Decouples RecordingScreen from routing logic |
| Hidden tab screens for new routes | Accessible via navigation, not shown in tab bar |
| Speaker assignment auto-shown for live only | Narration is single speaker, no assignment needed |
| Emotion intensity as left border color | Subtle visual indicator that doesn't overwhelm content |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated RecordingScreen to accept onTranscriptionComplete callback**
- **Found during:** Task 2
- **Issue:** RecordingScreen had hardcoded Alert for transcript completion; no way to route
- **Fix:** Added optional onTranscriptionComplete prop, falls back to Alert if not provided
- **Files modified:** mobile/src/features/recording/components/RecordingScreen.tsx
- **Commit:** 23d83cb

**2. [Rule 3 - Blocking] Added hidden tab screens in _layout.tsx**
- **Found during:** Task 2
- **Issue:** New routes (transcript/[id], post-recording-choice) inside Tabs layout need explicit screen entries
- **Fix:** Added Tabs.Screen entries with href: null to hide from tab bar
- **Files modified:** mobile/src/app/(main)/_layout.tsx
- **Commit:** 23d83cb

## Issues Encountered

None.

## Next Phase Readiness

### For 03-04+ (future transcript features):
- Transcript feature module fully self-contained with barrel export
- TranscriptView supports edit modal and speaker assignment
- PostTranscriptActions handles both standalone and inline display modes

### For 03-05 (live recording consent):
- Mode-aware routing already handles live vs narration
- TranscriptView auto-shows SpeakerAssignment for live recordings
- PostTranscriptActions inline mode ready at transcript bottom

### Blockers:
- None
