# Phase 3: Audio Pipeline - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can record conflicts via voice (self-narration or live with partner) and receive transcription with speaker-separated analysis. Includes pattern detection across all sessions (text + audio), conversation list UI, and insights dashboard. Partner collaboration features (sharing, exercises) belong to Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Recording Experience
- Two recording modes: **self-narration** (voice journal) and **live conflict capture**
- Self-narration does NOT require partner consent; live conflict requires per-session consent from both partners
- Self-narration is differentiated from text chat by capturing emotion/tone that typing filters out — positioned as voice journal for when user is too upset to type
- Optional guided prompts for self-narration (user can toggle guided vs free-form before recording)
- Waveform visualization during recording with timer and stop button
- After recording ends: preview with playback before submitting (can re-record)
- After transcript is ready, self-narration gives three options: **Get reframing**, **Receive comfort** (empathetic response), or **Just keep record**
- "Comfort mode" is a new AI response type — acknowledges feelings without reframing

### Live Conflict Recording Flow
- Initiator taps record → partner receives consent request via WebSocket (real-time) with push notification fallback
- If partner declines → offer self-narration as alternative ("Partner declined. Want to describe the situation in your own words?")
- Either partner can stop recording at any time; already-recorded portion is kept
- Persistent visible red recording indicator while recording — cannot be hidden

### Transcription & Diarization Display
- Chat bubble style display — Partner A on left, Partner B on right, with timestamps
- Real-time preview during recording + refined post-processing after
- Speaker identification: app detects Speaker 1/Speaker 2, user manually assigns names after transcription
- Users can tap any transcript line to edit — reassign speaker or fix text
- Subtle emotion indicators (color coding or small icons for emotional intensity, not explicit labels)
- Audio playback: full audio player + tap any transcript line to jump to that point in the audio

### Conversation List
- New conversation list view showing all sessions (text chat + audio recordings)
- Rich preview per entry: date, type icon (text/voice/live), brief summary, emotion indicator, unread status
- Recording creates an entry in conversation list that links to full transcript view

### Pattern Detection
- Three types of patterns detected: trigger phrases, recurring topics, and escalation patterns
- Patterns analyzed across ALL sessions (both text chats from Phase 2 and audio transcripts)
- Inline highlighting of trigger phrases in transcripts + summary section listing all found
- Dedicated insights tab with aggregated patterns across all sessions
- Per-session pattern callouts after each conversation/recording
- Visual charts + AI-generated text summaries for trends over time
- Neutral/observational tone for insights ("Finance-related conflicts appeared 4 times this month")
- Patterns update after each session + weekly summary digest
- Weekly summary delivered via push notification linking to in-app insights page

### Consent & Privacy
- Live recording requires per-session consent from both partners (every time)
- Either partner can delete any recording — respects both parties' autonomy
- Audio files deleted from server after transcription is complete — only transcript text remains
- Either partner can stop recording mid-session; already-recorded portion is kept and processed

### Claude's Discretion
- Maximum recording length (balance cost vs usability)
- Audio storage strategy (device-first vs server, given audio is deleted after transcription)
- Real-time transcription implementation approach
- Chart/visualization library and design for insights
- Comfort mode prompt engineering
- Exact emotion detection approach for subtle indicators

</decisions>

<specifics>
## Specific Ideas

- Self-narration positioned as voice journal — captures raw emotion that text filters out, lower barrier when crying/upset
- Three post-transcript options (reframe / comfort / just record) make voice journal feel therapeutic, not just utilitarian
- Chat bubble style for transcripts mirrors familiar messaging UX — Partner A left, Partner B right
- Conversation list makes the app feel like a comprehensive relationship journal, not just a chat tool
- Tap-to-jump audio playback on transcript lines for verification and emotional re-experiencing
- Weekly push notification with insights keeps users engaged between conflict events

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-audio-pipeline*
*Context gathered: 2026-02-03*
