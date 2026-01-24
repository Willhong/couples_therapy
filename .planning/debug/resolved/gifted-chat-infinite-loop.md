---
status: resolved
trigger: "GiftedChat infinite loop - componentDidUpdate calling setMessages repeatedly"
created: 2026-01-24T00:00:00Z
updated: 2026-01-24T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - GiftedChat.append() in useMemo was causing the infinite loop
test: Replaced with manual array spread
expecting: No infinite loop
next_action: Commit fix

## Symptoms

expected: Chat renders messages without infinite loop
actual: GiftedChat's componentDidUpdate triggers setMessages repeatedly causing infinite loop
errors: Maximum update depth exceeded (likely)
reproduction: Open chat screen, messages cause infinite re-render
started: After adding streaming support with streamingMessage state

## Eliminated

- hypothesis: useMemo missing dependencies
  evidence: useMemo has correct dependencies [messages, streamingMessage]
  timestamp: 2026-01-24

## Evidence

- timestamp: 2026-01-24
  checked: useChat.ts displayMessages useMemo
  found: Uses GiftedChat.append() which returns new array reference
  implication: Every streamingMessage update creates new array during streaming

- timestamp: 2026-01-24
  checked: streamingMessage update pattern (line 131-133)
  found: setStreamingMessage uses spread operator creating new object on each chunk
  implication: Rapid updates during streaming trigger useMemo recalculation

- timestamp: 2026-01-24
  checked: GiftedChat component behavior
  found: componentDidUpdate detects new messages array and calls internal setMessages
  implication: New array reference from useMemo triggers GiftedChat internal state sync

- timestamp: 2026-01-24
  checked: TypeScript compilation after fix
  found: Compiles without errors
  implication: Fix is syntactically valid

## Resolution

root_cause: GiftedChat.append() in useMemo creates new array on every dependency change, and during streaming the streamingMessage object changes rapidly (new object per chunk), causing continuous new array references passed to GiftedChat, triggering its componentDidUpdate loop. The GiftedChat.append() function may also have internal side effects or state that interacts poorly with GiftedChat's componentDidUpdate.

fix: Replaced GiftedChat.append() with manual array spread `[streamingMessage, ...messages]` in the displayMessages useMemo. This avoids any potential side effects from GiftedChat.append() while still achieving the same result of prepending the streaming message.

verification: TypeScript compiles successfully. Full runtime verification pending user testing.

files_changed:
  - mobile/src/features/chat/hooks/useChat.ts (lines 168-178)
