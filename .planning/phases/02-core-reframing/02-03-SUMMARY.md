---
phase: 02-core-reframing
plan: 03
subsystem: mobile-onboarding
tags: [react-native, expo, react-hook-form, zod, onboarding, questionnaire]
dependency_graph:
  requires: ["02-01"]
  provides: ["onboarding-questionnaire", "mobile-form-validation"]
  affects: ["02-04", "02-05"]
tech_stack:
  added:
    - react-hook-form@7.54.2
    - zod@3.24.2
    - "@hookform/resolvers@3.10.0"
    - "@react-native-community/slider@4.5.6"
  patterns:
    - Multi-step form wizard with per-step validation
    - Zod schema validation with react-hook-form integration
    - Feature-based directory structure (features/onboarding/)
key_files:
  created:
    - mobile/src/features/onboarding/types.ts
    - mobile/src/features/onboarding/services/onboardingApi.ts
    - mobile/src/features/onboarding/components/AttachmentStyleStep.tsx
    - mobile/src/features/onboarding/components/ConflictStyleStep.tsx
    - mobile/src/features/onboarding/components/GoalSelectionStep.tsx
    - mobile/src/features/onboarding/components/QuestionnaireWizard.tsx
    - mobile/src/features/onboarding/hooks/useOnboardingProgress.ts
    - mobile/src/app/onboarding/questionnaire.tsx
  modified:
    - mobile/package.json
    - mobile/src/app/onboarding/_layout.tsx
    - mobile/src/app/index.tsx
decisions:
  - id: slider-for-attachment
    choice: "@react-native-community/slider for 1-5 scale"
    reason: "Native slider component with consistent cross-platform behavior"
  - id: feature-directory
    choice: "features/onboarding/ structure"
    reason: "Scalable feature-based organization for growing codebase"
  - id: zod-validation
    choice: "Zod schemas with @hookform/resolvers"
    reason: "Type-safe validation with excellent TypeScript integration"
metrics:
  duration: 8m
  completed: 2026-01-23
---

# Phase 02 Plan 03: Mobile Onboarding Questionnaire Summary

**One-liner:** Multi-step questionnaire wizard with Korean UI for attachment style, conflict style, and goal selection using react-hook-form + zod validation

## What Was Built

### Onboarding Types and API Service
- TypeScript types for UserProfile, UserGoals, OnboardingStatus
- onboardingApi service with endpoints for profile and goals submission
- Type-safe focus area and conflict style enums

### Questionnaire Step Components
1. **AttachmentStyleStep**: Two slider questions measuring attachment anxiety and avoidance (1-5 scale)
   - Korean labels: 전혀 아님 / 가끔 / 보통 / 자주 / 항상
   - Visual feedback for current selection

2. **ConflictStyleStep**: Radio-style cards for conflict resolution style selection
   - Options: 회피형, 대면형, 협력형, 타협형
   - Communication frequency: 매일, 주 1-2회, 거의 안함

3. **GoalSelectionStep**: Primary goal and focus areas
   - Goals: 예방, 개선, 위기 대응 (with emoji icons)
   - Focus areas: 6 chips with max 3 selection

### Questionnaire Wizard
- Multi-step navigation with ProgressBar
- Per-step validation before advancing
- Zod schema validation for entire form
- API submission on completion
- Korean error messages

### Routing Integration
- New `/onboarding/questionnaire` route
- Updated flow: signup -> questionnaire -> partner-link -> tutorial -> home
- Proper Stack.Screen ordering in layout

## Commits

| Commit | Description |
|--------|-------------|
| 186b1d0 | Install form dependencies and create onboarding API service |
| f1985c4 | Create questionnaire step components |
| 72c9d96 | Create questionnaire wizard and route |

## Deviations from Plan

None - plan executed exactly as written.

## How It Works

```
User signs up
    |
    v
QuestionnaireWizard (3 steps)
    |
    +--> Step 1: AttachmentStyleStep
    |    - attachmentAnxiety (1-5)
    |    - attachmentAvoidance (1-5)
    |
    +--> Step 2: ConflictStyleStep
    |    - conflictStyle (avoid/confront/collaborate/compromise)
    |    - communicationFrequency (daily/weekly/rarely)
    |
    +--> Step 3: GoalSelectionStep
         - primaryGoal (prevention/improvement/crisis)
         - focusAreas (max 3 selections)
    |
    v
Submit to /api/v1/onboarding/
    |
    v
Redirect to partner-link
```

## Verification Status

| Criteria | Status |
|----------|--------|
| npm install succeeds with form packages | Verified via bun install |
| TypeScript compiles without errors | Verified |
| Questionnaire wizard shows 3 steps | Implemented |
| Each step validates before next | Implemented with trigger() |
| Completion calls onboarding API | Implemented in useOnboardingProgress |
| Routes to partner-link after completion | Implemented |

## Next Phase Readiness

**Ready for:**
- 02-04: Chat UI components can reuse form patterns
- 02-05: Reframing view can access user profile data

**Dependencies delivered:**
- onboardingApi service for profile/goals data
- Form validation patterns with react-hook-form + zod
- Feature-based directory structure established

## Related Files

- Backend API: `backend/apps/onboarding/views.py`
- Types: `mobile/src/features/onboarding/types.ts`
- Wizard: `mobile/src/features/onboarding/components/QuestionnaireWizard.tsx`
