# Phase 2: Core Reframing - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Text-based conflict logging with AI perspective reframing. Users describe conflicts via chat and receive bidirectional "how your partner might have heard this" reframing. AI acts as orchestrator for the couple, not just individual chatbot. This phase is text-only; voice input comes in Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Chat Interface
- **Input style:** Free-form chat OR keyword dump — AI organizes messy input into coherent conflict description
- **Suggestions:** Both tap-to-insert chips AND quick-reply buttons
- **Dynamic suggestions:** Update in real-time as user types
- **AI straightening:** Shows organized summary for user to confirm/correct before reframing
- **Multi-turn conversation:** Back-and-forth until user confirms "yes, that's accurate"
- **History:** Read-only (past entries visible but not editable)
- **Language:** Korean only for now (i18n deferred)
- **New vs continue conflict:** Explicit button available + AI infers linking (Claude decides UX balance)
- **AI thinking indicator:** Status message ("상대방 관점을 분석하고 있어요...")
- **Timestamps:** Always visible per message + date separators at midnight boundaries (user configurable)
- **No message deletion:** Messages permanent for accountability
- **Hard character limit:** Per message, encourage breaking into multiple
- **Stop generation:** User can cancel AI mid-stream
- **Copy enabled:** Long-press or copy button for AI responses
- **Screenshots allowed:** Users can attach screenshots; AI acknowledges what it sees to confirm vision
- **Session management:** Chat persists visually, but AI internally starts fresh with compacted summaries (context of situation/person preserved)

### Reframing Presentation
- **Display:** Separate view/modal (not inline in chat)
- **Bidirectional:** Shows both directions — "how they heard you" AND "how you heard them"
- **View mode:** User-configurable (side-by-side, sequential, or tabbed)
- **Structure:** Structured sections with icons: "What you said" → "How they heard it" → "Why the gap" → "Suggestions"
- **AI awareness:** Maintains awareness of displayed reframing for follow-up references
- **Interactive:** Follow-up prompt buttons ("Tell me more about this", "I disagree with this part")
- **Tone:** Coach-like — encouraging but honest
- **Suggestions format:** AI chooses numbered list OR scenario-based depending on situation
- **Section icons:** Visual icons to separate sections
- **Save to collection:** Heart/star button to bookmark important reframings
- **Guided regenerate:** "What didn't resonate?" prompt before regenerating analysis
- **Length:** Adaptive — matches complexity of conflict described
- **No confidence indicator:** Present analysis without hedging
- **Acknowledgment required:** User must tap "I've read this" before closing
- **Quotes:** Include direct quotes from user's original message
- **Animations:** Claude's discretion

### Sharing & Orchestration
- **AI role:** Orchestrator/facilitator for the couple, not separate chatbots
- **Relay mode:** Async — AI receives from one, processes, delivers to other at right time
- **Content relay:** Pass-through with context — partner sees original + AI's reframing together
- **Privacy levels:** Three levels — Full / Summary / None
- **Couple context:** Unified — AI knows both partners' entries, patterns, themes; references partner when relevant; shared timeline visible to both
- **Auto-relay:** Breakthroughs (genuine perspective shifts) auto-shared to partner
- **Manual sharing:** All other content user-controlled
- **No revoke:** Once shared, partner keeps access
- **Partner response:** Can comment/respond to shared content
- **Notifications:** Push + in-app for both sharing and responses
- **AI integration:** Weaves partner responses into next conversation context

### AI Behavior Guardrails
- **When user is wrong:** Coach honestly — point out problematic patterns directly but supportively
- **Abuse patterns:** Graduated response — gently flag + resources for mild; escalate directly for severe/repeated
- **Language:** Tone guidelines only (no explicit blocklist), maintain coach-like supportive tone
- **Venting:** Allow fully first, then gently offer reframing when ready
- **Harmful requests:** Two-step boundary — first redirect, then refuse if persists
- **Contradictory accounts:** Surface gently — "I notice different memories, let's explore what each felt"
- **Communication style:** Consistent for both partners
- **"Who's right?" questions:** Acknowledge need for validation → reframe toward values/impacts/unmet needs → state non-judgmental role
- **Pattern tracking:** Track silently, surface only with user consent

### Claude's Discretion
- Animation/transition design for reframing view
- Exact UX balance for new/continue conflict detection
- Specific suggestion chip/button content

</decisions>

<specifics>
## Specific Ideas

- AI should react to screenshots to confirm vision capability is working
- Chat compaction approach: AI maintains awareness via summaries, not raw history
- Bidirectional reframing is key — not just "how they heard you" but also "how you heard them"
- True couples therapy model: AI orchestrates between partners, not separate experiences

</specifics>

<deferred>
## Deferred Ideas

- i18n / multi-language support — future phase
- Voice input (speech-to-text) — Phase 3
- Couple dashboard showing shared progress — Phase 4

</deferred>

---

*Phase: 02-core-reframing*
*Context gathered: 2026-01-23*
