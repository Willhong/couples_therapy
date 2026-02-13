# Feature Landscape: v1.1 Intelligence & Launch

**Domain:** AI couples therapy -- intelligence layer, accumulative insights, personalized dashboard
**Researched:** 2026-02-13
**Scope:** NEW features only. v1.0 (chat, audio, patterns, check-ins, cooldown, prompts, partner linking, reframing, safety) already built.
**Confidence:** MEDIUM-HIGH

## Executive Summary

v1.1 transforms CouplesAI from a reactive tool (respond to each message) into an accumulative therapy system (listen across sessions, analyze when ready, deliver insights separately). This mirrors how real couples therapy works: therapists listen for weeks before offering observations.

The seven target features form a coherent intelligence layer. The chat agent becomes a therapeutic listener. Data accumulates across all touchpoints. Analysis triggers fire when data is sufficient. Insights arrive in a separate report. A health score and dashboard give users a daily at-a-glance view. Recommendations bridge the gap between insight and action.

Competitive analysis shows this accumulative paradigm is genuinely novel. Maia (YC W24) offers real-time conflict analysis. Lasting provides structured modules. Paired delivers daily questions. None accumulate multi-session data into periodic insight reports with a health score dashboard. This is the white space.

---

## Table Stakes

Features users expect from an AI therapy app that claims intelligence capabilities. Missing any of these makes the v1.1 upgrade feel hollow.

### TS-1: Chat agent that feels like talking to a therapist, not a search engine

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Users of Woebot, Wysa, and Noah AI report that "feeling heard" is the #1 factor in continued use. A therapeutic chatbot that immediately analyzes feels like a diagnostic tool, not a counselor. The Dartmouth clinical trial showed therapeutic alliance ratings comparable to human therapists when the AI prioritized listening. |
| **Expected Behavior** | Agent responds with empathy first. Asks follow-up questions. Does NOT immediately jump to analysis or advice. Remembers context within a session. Uses warm, non-judgmental language. Follows phases: rapport -> exploration -> deepening -> reflection. |
| **Complexity** | Medium -- Prompt engineering + conversation state management. No new models needed. |
| **Dependencies** | Existing chat infrastructure (WebSocket, Message model, conversation context). Feature flag for transition from current two-mode system. |
| **v1.1 Specific** | Transition from current "analyze each message" to "therapeutic listener" role. Must coexist with legacy mode via feature flag. Korean honorific consistency critical. |
| **Anti-pattern** | Agent that gives unsolicited advice. Agent that dumps analysis on every message. "I understand, but have you considered..." pattern (the "but" negates the empathy). |

### TS-2: Personalized AI context -- the AI knows who you are

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | APA research (2026) confirms personalization is the defining trend in mental health tech. Users abandon apps where AI "starts from scratch" every session. Woebot and Wysa both remember prior conversations and user profiles. |
| **Expected Behavior** | AI references user's attachment style, conflict style, communication preferences. Calibrates empathy tone accordingly (more reassurance for anxious attachment, more space for avoidant). Recognizes recurring topics without user re-explaining. Adapts questioning pace to communication frequency preference. |
| **Complexity** | Medium -- Cross-model data aggregation (6+ Django apps), caching (< 200ms), prompt injection with safety gates. |
| **Dependencies** | Existing UserProfile, UserGoals, SafetyAssessment, Pattern models. Requires cache infrastructure (Django cache). |
| **v1.1 Specific** | UserIntelligenceService assembles context snapshot. Safety-gated: high-risk users get minimal context. Pattern data used for better questions, NOT for per-message analysis. |
| **Anti-pattern** | Exposing raw pattern data in responses ("I see you fight about money 5 times"). AI that uses personalization to be manipulative or judgmental. |

### TS-3: Insight delivery as a separate, readable report

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Mentalyc (therapist tool) demonstrates that cross-session pattern reports are the expected format for accumulated insights. Users expect a clear, structured summary they can review at their own pace -- not insights crammed into chat flow. |
| **Expected Behavior** | Report has a title, summary, key insights (bullet points), suggested actions, and recommended activities. Accessible from a dedicated report screen. Marked as read/unread. Push notification when new report is available. Report covers a specific time period. Reports are not overwhelming (3-5 key insights max). |
| **Complexity** | Medium -- InsightReport model, API endpoints, mobile report screen. Backend exists as placeholder. |
| **Dependencies** | Multi-agent analysis pipeline (produces the report content). Intelligence app already scaffolded. Frontend report screens partially built. |
| **v1.1 Specific** | Two delivery channels: in-conversation (agent asks permission first) and separate report screen. Permission-based in-conversation delivery is critical -- never force insights on users during emotional conversations. |
| **Anti-pattern** | Dumping full analysis in chat. Generating reports too frequently (report fatigue). Reports that feel auto-generated/generic rather than personalized. |

### TS-4: Safety preserved through the intelligence upgrade

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | All AI therapy apps are scrutinized for safety. The Frontiers in Medicine 2025 review of the MIT-OpenAI therapy RCT highlights that safety must be embedded at every layer, not bolted on. Users trust therapy apps with their most vulnerable moments. |
| **Expected Behavior** | Existing keyword pre-filter and crisis detection unchanged. Ethics Guardian validates every analysis output. Three-level safety: per-message (real-time), chat agent monitoring (emotional intensity), analysis safety (cross-source patterns). Professional referral when needed. Crisis hotline information always available. |
| **Complexity** | Low for maintaining existing safety; Medium for adding Ethics Guardian to analysis pipeline. |
| **Dependencies** | Existing check_safety(), detect_crisis(), SafetyAssessment model, CrisisEvent model. |
| **v1.1 Specific** | Ethics Guardian uses primary chat model (not cheap model) -- safety validation in therapy requires nuanced reasoning. Fail-safe: if Ethics Guardian fails, BLOCK by default. |
| **Anti-pattern** | Using cheap models for safety validation. Allowing analysis to override safety. Crisis detection that only works on single messages but misses accumulated patterns of distress. |

---

## Differentiators

Features that set CouplesAI apart from competitors. Not table stakes, but create significant competitive advantage.

### DF-1: Accumulative multi-session insight reports

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | No competitor does this. Maia analyzes per-conversation. Lasting provides pre-built modules. CouplesAI accumulates data across chat sessions, check-ins, audio recordings, activities, and cooldowns, then synthesizes cross-source insights. This mirrors real therapy: a therapist who has seen you 5 times gives qualitatively different insights than one who just met you. |
| **Expected Behavior** | System collects data silently from all touchpoints. When enough data accumulates (3+ conversations, 60%+ information checklist, sufficient check-ins), a multi-agent analysis runs in the background. Five specialized agents analyze patterns, emotions, balance, resolution strategies, and ethics. Result is stored as an InsightReport. |
| **Complexity** | High -- LangGraph multi-agent pipeline with 5 agents running in parallel/sequential. TherapyDataCollector aggregating from 7+ data sources. Background Celery tasks. |
| **Dependencies** | All existing data sources (chat, check-ins, audio, patterns, activities, cooldowns). LangGraph (already installed). Celery (already configured). |
| **Competitive Context** | Mentalyc does this for therapists (not patients). No consumer couples therapy app offers automated cross-session analysis with multiple specialized AI agents. |
| **Risk** | Analysis quality must exceed simple per-message analysis to justify the complexity. If accumulated analysis is only marginally better, users won't see the value. |

### DF-2: Relationship Health Score (0-100)

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | A single number that captures relationship trajectory. Lasting mentions "relationship health" but uses assessment-based static scores. CouplesAI computes a dynamic, daily health score from 5 weighted components: mood (25%), escalation (25%), engagement (20%), pattern severity (15%), cooldown frequency (15%). The score changes daily based on actual behavior, not self-assessment. |
| **Expected Behavior** | Score displayed prominently on home dashboard. Components visible for transparency (what drives the score up/down). Historical trend visible (30-day chart). Grade labels in Korean (0-30: "dangerous", 31-50: "caution needed", 51-70: "moderate", 71-85: "good", 86-100: "excellent"). Computed daily via Celery task. Both individual and couple-level scores. |
| **Complexity** | Medium -- Weighted formula across 5 data sources. DailyHealthScore model. Celery scheduled task. API endpoints for current and historical scores. |
| **Dependencies** | DailyCheckIn (mood), WeeklySummary (escalation), Streak + CoupleActivity (engagement), Pattern (severity), CoolDown (frequency). |
| **Competitive Context** | The Paired app's MQoRS (Multidimensional Quality of Relationships Scale) is survey-based. Ringi offers assessment-based health checks. Neither offers a dynamic, behavior-derived daily score. |
| **Design Decisions** | Missing components get neutral score (50% of max) -- not 0 (which would penalize new users). Documented as design choice. Solo users get individual-only score. Streak cap at 7 for scoring prevents disproportionate influence. All magic numbers as named constants for tuning. |

### DF-3: Three-tier analysis triggers (periodic + sufficiency + crisis)

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Most apps either analyze every message (expensive, low-quality) or only on schedule (misses urgent situations). CouplesAI uses three trigger tiers: (1) Crisis/safety -- immediate, (2) Threshold breach (mood decline, escalation spike) -- within hours, (3) Data sufficiency (enough accumulated data) -- next analysis window, plus (4) Periodic weekly scheduled analysis. This means insights arrive when they matter, not on arbitrary schedules. |
| **Expected Behavior** | Celery beat evaluates triggers daily. Event-driven triggers fire after conversations end or check-ins are submitted. Cooldown between analyses prevents over-triggering (48-hour minimum). Configurable thresholds in Django settings. |
| **Complexity** | Medium -- Trigger evaluation logic, Celery tasks, configurable thresholds. Core logic is rule-based, not ML. |
| **Dependencies** | TherapyDataCollector (data aggregation), existing Celery infrastructure, DailyHealthScore (for threshold breach detection). |
| **Competitive Context** | No competitor has a documented multi-tier trigger system. Most use simple time-based triggers (weekly summary) or per-message analysis. |

### DF-4: Smart recommendations based on health score weaknesses

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Recommendations bridge the gap between "here's what's wrong" and "here's what to do." Instead of generic suggestions, map specific health score weaknesses to specific app content. Low mood -> gratitude prompts. High escalation -> lower-difficulty conversation activities. Recurring topic (finance) -> finance-related daily prompts. |
| **Expected Behavior** | Recommendations appear on home dashboard. Each has a reason in Korean explaining why it was suggested. Respects communication_frequency preference (2-5 items depending on user preference). No duplicates within 7 days. InsightReport recommendations take priority when both exist. Filters out recently completed activities. |
| **Complexity** | Medium -- Rule-based mapping from health score components to app content. InsightReport integration for LLM-generated recommendations. |
| **Dependencies** | HealthScoreService, CoupleActivity, DailyPrompt, InsightReport (for priority merging). UserProfile.communication_frequency for gating. |
| **Competitive Context** | Lasting's content is static (pre-built modules). Paired's daily questions are random. CouplesAI's recommendations are dynamic, data-driven, and personalized. |

### DF-5: Home dashboard with health score + daily tasks

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | The home screen is the "daily habit" entry point. Health score gives at-a-glance relationship status. Daily tasks (check-in, recommended activity, daily prompt) give purpose to each app open. Unread report badge creates pull to deeper engagement. This is the "3-minute daily touchpoint" that drives retention. |
| **Expected Behavior** | Health score displayed prominently with trend indicator (arrow up/down/stable). Today's tasks: mood check-in, recommended activity, daily prompt status. Report unread badge. Partner connection status. Quick-access to chat. Optimized for "quick glance" -- minimal scrolling. |
| **Complexity** | Medium -- Aggregation of multiple API endpoints into a single dashboard view. Frontend layout. Mobile-first design. |
| **Dependencies** | HealthScoreService, RecommendationService, DailyCheckIn, DailyPrompt, InsightReport unread count, Streak. |
| **Competitive Context** | Best-in-class health/wellness dashboards (Headspace, Calm, Fitbit) all use a single-screen daily summary. Couples apps (Paired, Lasting) have simpler home screens without composite health metrics. |

### DF-6: Partner data referenced but never directly quoted

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | This is a trust-building design decision, not a technical feature. In couples therapy, what one partner shares is confidential. The AI can reference that "partner seems to have different priorities around finances" but never quotes "your partner said 'you're terrible with money.'" This prevents weaponization of shared data while still enabling meaningful cross-partner analysis. |
| **Expected Behavior** | Analysis agents infer partner perspective from user's descriptions only. Partner dashboard shows aggregate stats (mood average, check-in streak, conversation count) -- no pattern content. Queryset-level isolation: partner's Pattern records are never loaded for the other partner. Balance Mediator constructs partner perspective from user's own words, not from partner's private data. |
| **Complexity** | Low-Medium -- Primarily query filtering and prompt constraints. Privacy architecture, not feature development. |
| **Dependencies** | SafetyAssessment (couple_features_enabled flag), Pattern model (queryset filtering). |
| **Competitive Context** | Between app stores all data encrypted but doesn't articulate reference-without-quoting policy. Maia's approach to shared data is unclear. CouplesAI's explicit "reference but never quote" policy is a trust differentiator. |
| **Risk** | If partner data isolation is imperfect (data leaks in prompts or responses), it destroys trust entirely. Must be verified with tests. |

---

## Anti-Features

Features to explicitly NOT build in v1.1. Tempting but harmful.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Per-message multi-agent analysis** | The fundamental paradigm change of v1.1. Per-message analysis is expensive (6-7x cost per message), produces shallow insights, and doesn't mirror real therapy. | Accumulate data silently, analyze in background when triggered. Chat agent listens, does not analyze. |
| **In-conversation analysis without permission** | Users in emotional distress don't want unsolicited analysis. Woebot's "sitting with open hands" philosophy: extend invitations, don't impose. | Always ask "Would you like me to share what I've noticed?" before delivering in-conversation insights. Respect "no." |
| **Real-time health score updates** | Score changing mid-conversation would distract from therapeutic process and create anxiety. "Your score just dropped 5 points" during a fight is counterproductive. | Compute health score daily via batch job. Show on dashboard, not during active interactions. |
| **Partner pattern content sharing** | Showing one partner's raw pattern data to the other creates ammunition for conflict. "The app says you use blame language 5 times!" | Show aggregate stats only. Reference patterns without quoting content. Queryset-level isolation. |
| **Automated therapy recommendations without context** | Generic "talk more" or "be more empathetic" advice is worse than no advice. Per AI therapy research, vague recommendations damage trust. | Every recommendation must cite a specific data point as its reason. "Your mood drops on conflict days -- try a gratitude exercise beforehand." |
| **Overly frequent insight reports** | Report fatigue is real. Users will stop reading if reports arrive daily. Mentalyc (therapist tool) recommends weekly cadence for longitudinal insights. | 48-hour cooldown between analyses. Weekly periodic trigger. Sufficiency trigger prevents premature analysis. |
| **Complex health score formula exposed to users** | Showing "mood: 18/25, escalation: 20/25, engagement: 14/20..." overwhelms users. | Show overall score + grade prominently. Component breakdown available on drill-down, presented as simple bar chart, not raw numbers. |
| **Chat agent that refuses to engage with emotions** | Some therapeutic chatbots become robotic when following strict "no analysis" rules. The agent should still validate, empathize, and reflect. | "No analysis" means no pattern interpretation or strategic advice. Empathy, validation, emotional reflection, and summary are all allowed and expected. |

---

## Feature Dependencies (v1.1 Specific)

```
[Infrastructure Prerequisites]
  Django Cache Config (I1) ------> UserIntelligenceService (A1)
  Database Indexes (I2) ---------> (performance, parallel)

[Layer 1: Chat Agent Transformation]
  Feature Flag -----> Chat Agent Refactoring (Task 1)
                         |
                         +--> Chat Agent Prompts
                         |       |
                         |       +--> Dynamic Prompt Builder (A2) -- needs A1
                         |
                         +--> Information Checklist + Phases
                         |
                         +--> Insight Delivery State (needs InsightReport)

[Layer 2: Data Collection & Derived Intelligence]
  UserIntelligenceService (A1) --+
                                 |
  MoodPatternService (B1) ------+---> HealthScoreService (C1)
                                 |         |
  CooldownAnalytics (E1) -------+         +--> DailyHealthScore (C3, Celery)
                                           |
                                           +--> RecommendationService (D1)
                                                    |
                                                    +--> Smart Prompt Selection (D3)

[Layer 3: Analysis Pipeline]
  TherapyDataCollector (Task 2) ----> AnalysisTriggerService (Task 3)
                                          |
                                          +--> Multi-Agent Analysis Graph (Task 4)
                                                    |
                                                    +--> InsightReport stored

[Layer 4: Delivery & Dashboard]
  InsightReport --------+
                        |
  HealthScoreService ---+---> Home Dashboard
                        |
  RecommendationService +
                        |
  DailyCheckIn ---------+
                        |
  Report Screen --------+

[Layer 5: Partner Features]
  Partner Dashboard (E2) -- independent, uses aggregate data only
```

### Critical Path
1. Cache Config -> UserIntelligenceService -> Chat Agent Personalization
2. Chat Agent Refactoring (can start parallel with #1)
3. TherapyDataCollector -> Trigger Service -> Analysis Graph -> InsightReport
4. HealthScoreService -> RecommendationService -> Dashboard

---

## Priority Matrix for v1.1 Phases

### Phase 1: Foundation (Must complete first)

| Feature | Type | Rationale |
|---------|------|-----------|
| Chat Agent as Therapeutic Listener (TS-1) | Table Stakes | Core paradigm shift. Everything else assumes this is in place. |
| UserIntelligenceService + Personalization (TS-2) | Table Stakes | Required for meaningful personalization across all features. |
| Intelligence Data Layer (TherapyDataCollector) | Infrastructure | Foundation for all analysis features. |
| Safety Preservation (TS-4) | Table Stakes | Non-negotiable. Must work from day one. |

### Phase 2: Intelligence Pipeline

| Feature | Type | Rationale |
|---------|------|-----------|
| Analysis Trigger Service (DF-3) | Differentiator | Controls when analysis fires. Must exist before analysis graph. |
| Multi-Agent Analysis Graph (DF-1) | Differentiator | Core intelligence. Produces the InsightReport content. |
| Insight Report Delivery (TS-3) | Table Stakes | Users need to see the analysis output. Both channels: report screen + in-conversation. |

### Phase 3: Health Score & Dashboard

| Feature | Type | Rationale |
|---------|------|-----------|
| MoodPatternService | Infrastructure | Feeds health score and recommendations. |
| HealthScoreService + Daily Task (DF-2) | Differentiator | The metric that ties everything together. |
| Home Dashboard (DF-5) | Differentiator | The daily touchpoint. Health score + tasks + report badge. |

### Phase 4: Recommendations & Partner Features

| Feature | Type | Rationale |
|---------|------|-----------|
| RecommendationService (DF-4) | Differentiator | Bridges insight to action. |
| Smart Prompt Selection | Differentiator | Context-aware daily prompts. |
| Partner Dashboard (DF-6) | Differentiator | Aggregate partner stats with privacy. |
| Cooldown Analytics | Differentiator | Escalation signal for health score. |

### Defer to v1.2+

| Feature | Reason |
|---------|--------|
| In-conversation insight delivery refinement | Get report screen working first. In-conversation delivery is more nuanced UX. |
| Activity Effectiveness Tracking (F1) | Needs enough activity completion data to be meaningful. |
| Prompt Response Alignment Analysis (F2) | Lower priority, needs both partners actively using prompts. |
| Report filtering/sorting/tabs | Get basic report list working first. |
| Advanced health score visualization (charts, trends) | Basic score + grade is sufficient for launch. |

---

## User Expectations by Feature (Behavioral Spec)

### Therapeutic Listener Chat Agent

**What users expect when they open chat:**
1. A warm greeting that acknowledges recent activity ("I saw you checked in with a mood of 2 today. How are you feeling?")
2. If they describe a conflict: empathetic listening first (2-3 messages of validation), then gentle exploration questions
3. If they ask "what should I do?": "Let me understand the full picture first. Can you tell me more about..." -- not immediate advice
4. If they say "analyze this" or "what do you think?": "I want to make sure I understand everything before sharing observations. Can we talk a bit more?"
5. After substantial conversation (5+ exchanges with conflict detail): "I think I have a good understanding now. Would you like me to summarize what I've heard?" -- this feeds the analysis trigger

**What users should NOT experience:**
- Immediate pattern analysis on first message
- Generic empathy that doesn't reference their specific situation
- Robotic question-asking without emotional warmth
- Different behavior between sessions (inconsistent persona)

### Insight Reports

**What users expect from a report:**
1. Clear title: "Week of Feb 3-9: Communication Patterns" or "Escalation Alert: Recent Trend Change"
2. 2-3 paragraph summary in accessible language (not clinical jargon)
3. 3-5 bullet-point key insights, each referencing specific data (conversations, check-ins, patterns)
4. 2-3 concrete suggested actions with specific next steps
5. Recommended app activities that map to the insights
6. Trigger context: "Based on your last 5 conversations and daily check-ins from this week"

**What users should NOT experience:**
- Reports that feel auto-generated ("Your communication could improve" with no specifics)
- Reports arriving during or immediately after an emotional conversation
- Reports that take sides or blame one partner
- Reports without actionable suggestions

### Health Score

**What users expect from the score:**
1. A clear number (0-100) with a meaningful label ("Good" / "Needs Attention")
2. Directional indicator (improving/declining/stable) compared to last week
3. On drill-down: which components are strong vs. weak, in simple visual form
4. Daily consistency -- the score updates once per day, not in real-time
5. Both individual and couple-level scores when both partners are active

**What users should NOT experience:**
- Score anxiety (score shown during active conflicts)
- Unexplained drops (score changed but no indication why)
- Score that feels arbitrary or disconnected from their experience
- Score presented competitively between partners

### Dashboard

**What users expect from the home screen:**
1. Health score front and center with trend
2. Today's tasks: mood check-in status, today's prompt, recommended activity
3. Unread report badge (draws attention to new insights)
4. Quick access to chat
5. Partner connection status
6. Everything visible without scrolling (single-screen design)

**What users should NOT experience:**
- Overwhelming number of items (max 3-4 daily tasks)
- Stale data (yesterday's check-in showing as "done")
- Empty state without guidance (new users should see onboarding tasks)

---

## Mood-Pattern Correlation (Supporting Feature)

Not a standalone user-facing feature, but a critical supporting service.

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Correlates DailyCheckIn mood data with conversation patterns and cooldown usage. Answers: "Does your mood drop on conflict days?" |
| **Consumers** | UserIntelligenceService (real-time chat context), TherapyDataCollector (background analysis), HealthScoreService (mood component), AI prompt context. |
| **Output** | mood_trend, avg mood on conflict vs. non-conflict days, risk day count, correlation insight in Korean. |
| **Complexity** | Medium -- time-series correlation across DailyCheckIn + InsightSummary + CoolDown. Must handle sparse data gracefully. |
| **Key Design Decision** | When no InsightSummary records exist (new users), return mood-only stats with null correlation fields. Never error on missing data. |

---

## Sources

### HIGH Confidence
- Existing codebase analysis: `accumulative-therapy-system.md`, `backend-intelligence-upgrade.md`, `multi-agent-therapy-pipeline.md`, `frontend-intelligence-ui-gap-v1.md`
- [Dartmouth Therapy Chatbot Trial (2025)](https://home.dartmouth.edu/news/2025/03/first-therapy-chatbot-trial-yields-mental-health-benefits) -- therapeutic alliance comparable to human therapists
- [Wysa Therapeutic Alliance Study (Frontiers)](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2022.847991/full) -- flexible conversational interface builds relational capacity
- [APA Personalized Mental Health Trends (2026)](https://www.apa.org/monitor/2026/01-02/trends-personalized-mental-health-care) -- personalization as defining trend

### MEDIUM Confidence
- [Woebot Conversation Design Case Study](https://uxwritinghub.com/woebot-case-study-in-conversation-design-for-mental-health-products/) -- listen-first philosophy, familiar chat UX
- [Paired App MQoRS Study (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12001865/) -- multidimensional relationship quality measurement
- [AI-based Psychotherapy Usability Study (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12274205/) -- user expectations for personalization and progress perception
- [BMC Psychiatry - Clinician Expectations for AI](https://bmcpsychiatry.biomedcentral.com/articles/10.1186/s12888-025-06957-3) -- 62% support precise personalized therapy
- [Stanford Relationship Research Lab](https://www.pvcnr.com/archives/57845) -- 35% of couples use AI-assisted therapy
- [Maia App (YC W24)](https://www.ycombinator.com/companies/maia) -- competitive reference, voice analysis + daily activities
- [Talkspace AI Couples Therapy](https://www.talkspace.com/blog/ai-couples-therapy/) -- privacy concerns, triangulation risks

### LOW Confidence (needs validation)
- [Frontiers - MIT-OpenAI RCT Balance Perspective](https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2025.1612838/full) -- safety embedding requirements
- [Personalisation for Mental Health Apps Scoping Review](https://www.tandfonline.com/doi/full/10.1080/0144929X.2024.2356630) -- adaptive treatment algorithms
- 28% reduction in recurring arguments claim (Journal of Couple and Relationship Therapy) -- cited in secondary source, not verified directly
