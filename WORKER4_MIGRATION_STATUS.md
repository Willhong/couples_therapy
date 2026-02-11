# Worker 4: Design Token Migration Status

## Overview
Migrating 26 feature module components to use centralized design tokens from `@/theme`.

## Completed Files (9/26)

### Onboarding Components (5/5) ✅
1. **QuestionnaireWizard.tsx** ✅
   - Added `import { colors } from '@/theme'`
   - Migrated all styles to use color tokens
   - Updated ActivityIndicator color prop

2. **AttachmentStyleStep.tsx** ✅
   - Added colors import
   - Updated all StyleSheet colors
   - Migrated Slider component colors

3. **ConflictStyleStep.tsx** ✅
   - Added colors import
   - Replaced all hardcoded hex values with tokens

4. **GoalSelectionStep.tsx** ✅
   - Added colors import
   - Migrated all color values including chips and badges

5. **PartnerWelcomeScreen.tsx** ✅
   - Added colors import
   - Updated all styles to use tokens

### Insights Components (4/4) ✅
6. **InsightsDashboard.tsx** ✅
   - Added colors import
   - Migrated all styles and ActivityIndicator

7. **PatternChart.tsx** ✅
   - Added colors import
   - Updated TOPIC_COLORS array to use tokens
   - Migrated getTrendColor function
   - Updated all chart component color props
   - Note: Conditional rgba() strings kept as-is (data-driven)

8. **WeeklySummaryCard.tsx** ✅
   - Added colors import
   - Updated TREND_CONFIG to use color tokens
   - Migrated all styles
   - Note: trend.color + '1A' pattern is data-driven, kept as-is per spec

9. **TranscriptView.tsx** - IN PROGRESS

## Remaining Files (17/26)

### Transcript Components (5)
- [ ] TranscriptView.tsx
- [ ] TranscriptLine.tsx
- [ ] AudioPlayer.tsx
- [ ] PostTranscriptActions.tsx
- [ ] SpeakerAssignment.tsx

### Cooldown Components (2)
- [ ] CoolDownScreen.tsx
- [ ] BreathingGuide.tsx

### Reframing Components (3)
- [ ] ReframingModal.tsx
- [ ] PerspectiveView.tsx
- [ ] SuggestionList.tsx

### Prompts Components (3)
- [ ] DailyPromptCard.tsx
- [ ] PromptHistory.tsx
- [ ] TopicLibrary.tsx

### Conversations Components (2)
- [ ] ConversationCard.tsx
- [ ] ConversationList.tsx

### Sharing Components (1)
- [ ] ShareModal.tsx

### Safety Components (2)
- [ ] SafetyAssessment.tsx
- [ ] CrisisResponseCard.tsx

## Migration Pattern

For each file:
1. Add import: `import { colors } from '@/theme';`
2. Replace hardcoded colors with tokens:
   - `#F9FAFB` → `colors.bgPage`
   - `#FFFFFF` → `colors.white`
   - `#6B7FD7` → `colors.primary`
   - `#E5E7EB` → `colors.border`
   - `#111827` / `#1F2937` → `colors.textPrimary` or `colors.gray800`
   - `#6B7280` → `colors.textSecondary`
   - `#9CA3AF` → `colors.textTertiary`
   - `#EF4444` → `colors.error`
   - `#10B981` → `colors.success`
   - `#F59E0B` → `colors.warningAmber`
   - etc.

3. Update component color props (ActivityIndicator, Slider, etc.)
4. Leave data-driven rgba() concatenations as-is (e.g., `trend.color + '1A'`)

## Color Mapping Reference

### Core Colors
- `#FFFFFF` → `colors.white`
- `#000000`, `#000` → `colors.black`
- `#F9FAFB` → `colors.bgPage`
- `#F3F4F6` → `colors.bgAiMessage`
- `#E5E7EB` → `colors.border`

### Primary/Brand
- `#6B7FD7` → `colors.primary`
- `#E8EBFA`, `#F5F6FF` → `colors.primaryLight`
- `#F0F4FF`, `#EFF6FF`, `#E0E7FF` → `colors.primaryBg`

### Text
- `#111827`, `#1F2937` → `colors.textPrimary` or `colors.gray800`
- `#6B7280` → `colors.textSecondary`
- `#9CA3AF` → `colors.textTertiary`
- `#374151` → `colors.gray700`
- `#4B5563` → `colors.gray600`

### Status Colors
- `#EF4444` → `colors.error`
- `#FEF2F2` → `colors.errorBg`
- `#10B981` → `colors.success`
- `#D1FAE5` → `colors.successBg`
- `#F59E0B` → `colors.warningAmber`
- `#92400E`, `#C2410C` → `colors.warning`
- `#FEF3C7` → `colors.warningBg`

### Danger/Crisis
- `#991B1B` → `colors.dangerText`
- `#7F1D1D` → `colors.dangerTextDark`
- `#DC2626` → `colors.error`
- `#B91C1C` → `colors.dangerText`

### Utility
- `#D1D5DB` → `colors.gray300`
- `#3B82F6` → `colors.blueMedium`
- `transparent` → `colors.transparent`

## Special Cases

### Data-Driven Colors (DO NOT REPLACE)
Files with dynamic color patterns that should remain as-is:
- **WeeklySummaryCard.tsx**: `trend.color + '1A'` - data-driven opacity
- **PatternChart.tsx**: Conditional rgba() strings in chart rendering

### rgba() Patterns
- `rgba(107, 127, 215, X)` → Can use `alpha(colors.primary, X)` if alpha helper available
- Currently keeping rgba() strings as-is for chart libraries

## Next Steps
1. Complete remaining 17 files following the same pattern
2. Run LSP diagnostics on all modified files
3. Test build to ensure no import/type errors
4. Visual verification of color consistency across all screens

## Verification Commands
```bash
# Check for remaining hardcoded colors in owned files
grep -r "#[0-9A-Fa-f]\{6\}" mobile/src/features/onboarding/components/
grep -r "#[0-9A-Fa-f]\{6\}" mobile/src/features/insights/components/
# ... etc for all feature directories

# Build check
cd mobile && npm run typecheck
```
