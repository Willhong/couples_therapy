# Milestones: CouplesAI

## v1.0 — Core Therapy Features (Completed)

**Shipped:** 2026-02-08
**Phases:** 1-4 + Post-4 Hardening (24 plans + 4 workstreams)
**Tests:** 66 passing (100%)

### What Shipped
- Foundation & Safety: Email auth, partner linking, consent, tutorial, PIPA
- Core Reframing: Text chat, AI two-mode pipeline (chat + reframing), onboarding
- Audio Pipeline: Recording, transcription, speaker diarization, pattern detection, insights
- Partner & Engagement: Cool-down timer, daily prompts, topic library, abuse screening
- Hardening: Crisis detection, PIPA compliance, partner invitation UX, shared content viewer

### Key Decisions
- Email-only auth, React Native (Expo SDK 54), custom chat UI (replaced GiftedChat)
- Two-mode single-call LLM pipeline, keyword-based safety pre-filter
- OpenRouter for multi-model access, OpenAI direct for transcription
- Regular HTTP instead of SSE (RN doesn't support ReadableStream)

### Remaining from v1.0
- WS4 Production Readiness (PostgreSQL, push notifications, performance, App Store) → moved to v1.1

---
*Last phase completed: Post-Phase 4 (2026-02-08)*
*Last phase number: 4 (+ post-4 workstreams)*
