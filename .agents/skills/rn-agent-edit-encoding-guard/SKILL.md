---
id: rn-agent-edit-encoding-guard
name: React Native Agent Edit Encoding Guard
description: Prevent and recover from TSX file corruption during parallel agent-driven UI migrations in this repository.
source: conversation
triggers:
  - "garbled TSX characters"
  - "UTF-16 UTF-8 corruption"
  - "TouchableOpacity to Pressable migration"
  - "TopicLibrary.tsx broken"
  - "GuidedPrompts.tsx broken"
  - "SafetyAssessment.tsx broken"
quality: high
---

# React Native Agent Edit Encoding Guard

## The Insight
In this codebase, parallel agent edits on large React Native `.tsx` files can silently corrupt file encoding during bulk text replacement. Treat agent output as potentially encoding-unsafe when multiple similar files are rewritten in parallel.

## Why This Matters
During the `TouchableOpacity -> Pressable` rollout, three files became unreadable with binary-like gibberish:
- `mobile/src/features/prompts/components/TopicLibrary.tsx`
- `mobile/src/features/recording/components/GuidedPrompts.tsx`
- `mobile/src/features/safety/components/SafetyAssessment.tsx`

This broke the source itself, not just behavior. Continuing edits on top of corrupted files compounds data loss.

## Recognition Pattern
Apply this skill when all of these appear:
- Parallel agent batch edits across multiple `.tsx` files
- A worker reports encoding conversion or patch fallback issues
- `Get-Content` output looks like mojibake/binary text instead of TypeScript

## The Approach
1. Stop the failing batch immediately; do not continue layered edits.
2. Restore only corrupted files from `HEAD` first:
   - `git restore --source=HEAD -- <file1> <file2> ...`
3. Re-run the intended migration on the restored file set only.
4. Gate completion with a focused check tied to the migration objective:
   - For this migration: `rg -n "TouchableOpacity" mobile/src`
   - Exit code `1` (no matches) is expected and means success.
5. Prefer smaller worker ownership batches for high-churn UI files.

## Example
```powershell
git restore --source=HEAD -- `
  "mobile/src/features/prompts/components/TopicLibrary.tsx" `
  "mobile/src/features/recording/components/GuidedPrompts.tsx" `
  "mobile/src/features/safety/components/SafetyAssessment.tsx"

rg -n "TouchableOpacity" mobile/src
```

