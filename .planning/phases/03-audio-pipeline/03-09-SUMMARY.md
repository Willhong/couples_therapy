---
phase: 03-audio-pipeline
plan: 09
subsystem: recording-ui
tags: [ui-polish, buttons, guided-prompts, ux]
dependency-graph:
  requires: [03-02, 03-05]
  provides: [polished-consent-buttons, guided-prompt-tap-hint]
  affects: []
tech-stack:
  added: []
  patterns: [labelRow-with-hint, consistent-button-sizing]
key-files:
  created: []
  modified:
    - mobile/src/features/recording/components/LiveConsentFlow.tsx
    - mobile/src/features/recording/components/GuidedPrompts.tsx
decisions: []
metrics:
  duration: 3m
  completed: 2026-02-08
---

# Phase 3 Plan 9: UI Polish Summary

**One-liner:** Fixed cancel button sizing consistency in LiveConsentFlow and added tap hint with shadow to GuidedPrompts chips

## What Was Done

### Task 1: Fix LiveConsentFlow cancel button styling
- Added `minHeight: 48` and `justifyContent: 'center'` to both `primaryButton` and `secondaryButton` styles for consistent touch targets
- Wrapped standalone secondary buttons (in `waiting_consent` and `consent_granted` responder phases) inside `buttonGroup` containers so they get full-width styling matching buttons in other phases
- All cancel/close buttons now render at the same size as primary buttons across all consent flow screens

### Task 2: Add visual hint to GuidedPrompts indicating tappability
- Added `Ionicons` import from `@expo/vector-icons`
- Created `labelRow` layout with the existing label on the left and a new tap hint (hand icon + "tap to select" text) on the right
- Moved `marginBottom` from `label` to `labelRow` for proper spacing
- Added subtle shadow (`shadowOpacity: 0.05`, `elevation: 1`) to chip styles to make them look more interactive/tappable

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] `npx tsc --noEmit` passes with no errors
- [x] LiveConsentFlow cancel button has proper, consistent sizing (minHeight: 48, full-width via buttonGroup)
- [x] GuidedPrompts shows "tap to select" hint next to label
- [x] Chips have subtle shadow for interactive appearance
- [x] `secondaryButton` present in LiveConsentFlow.tsx (artifact verified)
- [x] `tapHint` present in GuidedPrompts.tsx (artifact verified)

## Commits

| Hash | Message |
|------|---------|
| 412cea4 | fix(03-09): fix LiveConsentFlow cancel button styling |
| ec28966 | feat(03-09): add visual tap hint to GuidedPrompts |

## Next Phase Readiness

No blockers. This was a gap-closure UI polish plan. Remaining gap-closure plans (03-08, 03-10) can proceed independently.
