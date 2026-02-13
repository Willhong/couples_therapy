# Domain Pitfalls: CouplesAI v1.1 Intelligence & Launch

**Domain:** Adding accumulative therapy intelligence + production readiness to existing Django/Expo couples therapy app
**Researched:** 2026-02-13
**Confidence:** HIGH (based on codebase analysis, documented production failures, official documentation)
**Scope:** v1.1-specific integration pitfalls. For v1.0 domain pitfalls (abuse screening, legal, gaslighting, data breach), see git history of this file.

---

## Critical Pitfalls

Mistakes that cause rewrites, user harm, or production outages.

---

### Pitfall 1: Removing Immediate Gratification Without Replacement Value

**What goes wrong:** The v1.0 chat agent gives users instant per-message analysis, reframing, and suggestions. v1.1 replaces this with a "therapeutic listener" that only empathizes and asks questions. Users feel the app got worse -- they lost the feature they came for and received nothing tangible in return.

**Why it happens:**
- The accumulative paradigm is architecturally sound but delivers value on a DELAYED schedule (days/weeks)
- New users have zero accumulated data, so they get empathy-only chat with NO insight reports for potentially weeks
- The transition from "immediate analyst" to "patient listener" feels like a downgrade to users who don't understand the vision
- Feature flag means some users have old behavior and some have new -- creating confusion if they communicate about the app

**Consequences:**
- Day-1 users see a worse experience than v1.0 users had
- Existing v1.0 users who update feel features were removed
- User retention drops during the "data accumulation" period before first insight report
- Negative app store reviews: "App used to give analysis, now it just asks questions"

**Prevention:**
1. **Bridge the gap with micro-insights:** Even in therapeutic listener mode, provide small value signals per session -- a brief reflection summary at conversation end ("Here's what I heard today"), mood tracking confirmation, or a "your data is being analyzed" progress indicator
2. **Transparent communication:** Explain the new approach in-app: "I'm now listening more carefully across sessions to give you deeper insights" -- not just silently changing behavior
3. **Graduated transition:** Don't flip to 100% listener immediately. Start with listener behavior for first 5-8 messages, then offer a LIGHTER version of reframing (not the full multi-agent pipeline, but a single-call perspective nudge) as a bridge
4. **Visible accumulation progress:** Show "Insight readiness: 40% -- 2 more conversations needed" on home screen so users see the system is working toward something
5. **Ensure first insight report arrives within 1 week** for active users (adjust trigger thresholds aggressively for new users)

**Detection (warning signs during development):**
- No UX mockup showing what new users see for the first 3 days
- No "onboarding to the new paradigm" screen designed
- Trigger thresholds set so high that first report takes >2 weeks

**Phase to address:** Must be addressed in the same phase that implements chat agent refactoring. Cannot ship therapeutic listener without the bridge UX.

**Confidence:** HIGH -- this is the single most dangerous UX pitfall in v1.1. The accumulative-therapy-system.md plan acknowledges this paradigm shift but the migration strategy (Phase 1-5 rollout) doesn't specify what users SEE during the data collection period.

---

### Pitfall 2: LangGraph Multi-Agent Pipeline Production Failures

**What goes wrong:** The 6-agent analysis graph (Pattern Analyst + Emotion Interpreter in parallel, then Balance Mediator, Resolution Strategist, Report Synthesizer, Ethics Guardian) fails in production due to cascading errors, timeouts, runaway costs, or thread exhaustion.

**Why it happens:**
- Each agent makes an independent LLM call. Any single call can timeout, return malformed JSON, or hit rate limits
- LangGraph parallel execution creates threads -- under load, "can't start a new thread" RuntimeError crashes the Celery worker ([GitHub issue #2873](https://github.com/langchain-ai/langgraph/issues/2873))
- 6 sequential-ish LLM calls with the chat model at ~1024 tokens each = potential $0.10-0.30 per analysis run. At scale with misconfigured triggers, costs explode
- The trigger service evaluates ALL active users on a Celery beat schedule -- if 1000 users are active, that's 1000 trigger evaluations + potentially hundreds of 6-agent pipeline runs
- One developer's first production day with a similar LangChain pipeline resulted in a [$127 OpenAI bill](https://medium.com/@kasimoluwasegun/langchain-in-production-beyond-the-tutorials-e7b7f2506572)
- LangGraph deployment timeout errors documented: "Deployment is not ready after 300 seconds" ([GitHub issue #4620](https://github.com/langchain-ai/langgraph/issues/4620))

**Consequences:**
- Celery worker crashes take down background processing (affects pattern analysis, cooldown timers, etc.)
- Unexpected API bills from OpenRouter/OpenAI
- Partial analysis results stored in InsightReport when some agents succeed and others fail
- Users receive garbled or incomplete insight reports
- Ethics Guardian failure means unsafe content passes through (the plan says "fail-safe to BLOCK" but this needs ironclad implementation)

**Prevention:**
1. **Per-agent timeout:** Set individual LLM call timeouts (30 seconds per agent, 180 seconds total graph timeout). Kill and return partial results rather than hanging
2. **Cost ceiling:** Implement a daily/hourly token budget. When budget exhausted, queue analyses for next window instead of running immediately
3. **Circuit breaker pattern:** If 3 consecutive analyses fail for the same error type (rate limit, timeout), stop dispatching for 1 hour
4. **Celery task isolation:** Run analysis tasks in a SEPARATE Celery queue with dedicated workers. Never share queue with real-time tasks (pattern analysis, cooldown)
5. **Thread pool limit:** Configure LangGraph to use a bounded thread pool (not unbounded thread creation) for parallel nodes
6. **Graceful degradation per-agent:** If Pattern Analyst fails, Balance Mediator should work with only Emotion Interpreter output. Report Synthesizer must handle any combination of missing agent outputs
7. **Shadow mode first:** Run analysis pipeline for 2 weeks without delivering results to users. Compare costs, failure rates, and output quality against expectations
8. **Rate limit trigger evaluation:** Don't evaluate all active users at once. Batch with delays (100 users per minute, not 1000 at midnight)

**Detection (warning signs during development):**
- No cost monitoring dashboard planned
- No per-agent timeout configuration
- Celery beat schedule evaluates all users in a single task
- No tests for partial agent failure scenarios
- Ethics Guardian test coverage is thin

**Phase to address:** Must be addressed when building the analysis graph (Task 4 in accumulative-therapy-system.md). Shadow mode should run for at least one full phase before enabling delivery.

**Confidence:** HIGH -- [LangGraph production issues are well-documented](https://github.com/langchain-ai/langgraph/issues/2873), and the architecture plan has 6 agents each making LLM calls, which multiplies every production risk by 6.

---

### Pitfall 3: SQLite to PostgreSQL Migration Corrupting Encrypted Data

**What goes wrong:** Migration from SQLite to PostgreSQL fails silently or corrupts data, particularly the Fernet-encrypted fields (EncryptedTextField) used throughout the codebase for sensitive therapy content.

**Why it happens:**
- The codebase uses `EncryptedTextField` (fernet_fields) on at least 8 models: Message.content, ConversationSummary.summary_text, SharedReframing.partner_response, InsightReport.pattern_analysis/emotion_analysis/balance_analysis/resolution_suggestions/report_summary
- Fernet-encrypted fields store binary data. SQLite handles binary loosely; PostgreSQL is strict about `bytea` encoding
- Standard `dumpdata`/`loaddata` approach can [mangle binary field encodings](https://gist.github.com/sirodoht/f598d14e9644e2d3909629a41e3522ad) when crossing database backends
- UUID primary keys (used on ALL models: Conversation, Message, InsightReport, etc.) may have format differences between SQLite (stored as text without dashes) and PostgreSQL (native UUID type)
- `django-fernet-fields` documentation explicitly warns: ["You won't be able to use a simple AlterField operation"](https://django-fernet-fields.readthedocs.io/en/latest/) when dealing with encrypted data migrations
- ContentType IDs differ between fresh PostgreSQL migrations and SQLite dumps, causing foreign key mismatches
- Signals (post_save) may fire during `loaddata`, creating duplicate entries

**Consequences:**
- ALL encrypted therapy data becomes unreadable (messages, summaries, insights)
- Users lose their conversation history -- the most sensitive and valuable data
- If FERNET_KEYS are not correctly carried over, ALL encrypted data is permanently lost
- Foreign key constraint violations crash the import
- Partial migration leaves database in inconsistent state

**Prevention:**
1. **Test migration with production-like data first:** Create a test SQLite database with encrypted fields, UUIDs, and cross-table relationships. Migrate it to PostgreSQL. Verify EVERY encrypted field decrypts correctly
2. **Use a custom migration script, not dumpdata/loaddata:** Write a Python script that reads from SQLite via Django ORM (which auto-decrypts), then writes to PostgreSQL via Django ORM (which auto-encrypts). This ensures the ORM handles encryption/decryption correctly at both ends
3. **Verify FERNET_KEYS transfer:** The exact same key(s) must be in both environments. Even a single character difference means all encrypted data is lost
4. **Exclude and re-create ContentTypes:** Use `--exclude contenttypes --exclude auth.Permission` or recreate them fresh
5. **Disable signals during migration:** Temporarily disconnect post_save signals to prevent duplicates
6. **UUID format verification:** After migration, spot-check that UUID foreign keys resolve correctly (conversation -> messages, message -> shares)
7. **Backup, backup, backup:** Keep the original SQLite file untouched. Only migrate a copy. Keep the SQLite backup for at least 30 days post-migration
8. **Migration order matters:** Users -> Couples -> Conversations -> Messages -> Patterns -> InsightReports (follow foreign key dependencies)

**Detection (warning signs during development):**
- Migration plan says "just use dumpdata/loaddata"
- No test migration attempted before production
- FERNET_KEYS stored only in local .env, not documented for production transfer
- No rollback plan documented

**Phase to address:** WS4-01 (PostgreSQL migration). Must be completed before any production deployment of v1.1 intelligence features.

**Confidence:** HIGH -- the combination of UUID primary keys + Fernet-encrypted fields + foreign key relationships across 13 apps makes this a high-risk migration. Generic Django migration guides don't address this combination.

---

### Pitfall 4: asyncio.run() Event Loop Conflict Under ASGI/Daphne

**What goes wrong:** The existing `views.py` uses `asyncio.run()` to call the async LLM pipeline from synchronous Django views. This works under WSGI (development) but crashes under ASGI (Daphne, which is already installed and configured in `base.py`).

**Why it happens:**
- `base.py` already has `ASGI_APPLICATION = 'config.asgi.application'` and `daphne` is first in INSTALLED_APPS
- `asyncio.run()` creates a NEW event loop. Under ASGI, an event loop is ALREADY running. Calling `asyncio.run()` from within an existing loop throws `RuntimeError: asyncio.run() cannot be called from a running event loop`
- This is a [known issue](https://github.com/langchain-ai/langchain/issues/8494) with LangChain/LangGraph in Django ASGI environments
- The current code works only because development runs WSGI. Production with Daphne/Uvicorn will use ASGI
- The accumulative-therapy-system.md notes this: "convert views to Django 5.x native async views in a follow-up" -- but this is a blocker, not a follow-up

**Consequences:**
- Chat functionality completely broken in production ASGI deployment
- Audio analysis pipeline (also uses `asyncio.run()`) breaks too
- All LLM-powered features (reframing, comfort mode, analysis) are non-functional
- The app appears to work in development but crashes in production

**Prevention:**
1. **Convert to async views NOW, not as follow-up:** Django 5.x natively supports `async def` views. Convert `reframe_message`, `comfort_message`, and audio views to async views that can `await` the pipeline directly
2. **OR use `sync_to_async`/thread pool:** If not converting views, use `asyncio.get_event_loop().run_in_executor()` or Django's `sync_to_async` pattern to run the async pipeline from sync views
3. **Test under Daphne BEFORE production:** Run the full test suite under `daphne` (not `runserver`) to catch event loop conflicts early
4. **Update the LangGraph analysis tasks too:** Celery tasks calling `asyncio.run()` to execute the analysis graph will also fail if the Celery worker uses an event loop (e.g., with gevent pool)

**Detection (warning signs):**
- All tests pass locally but chat fails on staging/production
- Error logs show `RuntimeError: This event loop is already running`
- Works with `python manage.py runserver` but not `daphne`

**Phase to address:** MUST be resolved in the same phase as chat agent refactoring or PostgreSQL migration. This is a production blocker, not a future improvement.

**Confidence:** HIGH -- the code literally has `asyncio.run()` in `views.py` lines 334 and 623, and `ASGI_APPLICATION` is configured in settings. This WILL break in production ASGI deployment.

---

## Moderate Pitfalls

Mistakes that cause user confusion, poor data quality, or significant rework.

---

### Pitfall 5: Health Score Meaningless for New/Sparse Users

**What goes wrong:** The Health Score displayed on the home dashboard shows misleading numbers for users who have minimal data. New users see a score that's either artificially high (default), artificially low (insufficient data penalized), or absent (empty state), none of which inspire confidence.

**Why it happens:**
- Health Score formula (from backend-intelligence-upgrade.md C1) aggregates: mood check-ins, pattern escalation, engagement metrics, conversation frequency
- New users have 0 check-ins, 0 patterns, 0 conversations -- every input is null/empty
- The [cold start problem](https://spotintelligence.com/2024/02/08/cold-start-problem-machine-learning/) is well-documented: scoring systems without data either guess wrong or show nothing
- If the score starts at 50 (neutral) and only goes up with positive signals, it misleadingly suggests the relationship is "average" with zero data
- If it starts at 0, it suggests the relationship is terrible
- If it shows "N/A", users never engage with the feature to provide the data needed

**Consequences:**
- Users distrust the Health Score from day one
- "Our relationship scored 50 out of 100?!" creates anxiety
- Users who see an empty dashboard don't return to check later
- Health Score becomes meaningless because it started meaningless

**Prevention:**
1. **Progressive disclosure:** Don't show the score until minimum data threshold met (e.g., 3 check-ins + 2 conversations). Show instead: "Complete 3 check-ins to unlock your relationship health score"
2. **Confidence indicator:** Display "Confidence: Low (based on 2 data points)" alongside the score so users understand it will improve
3. **Component-level visibility:** Show which score components have data and which need more: "Mood tracking: active | Communication patterns: needs more data"
4. **Engagement-weighted scoring:** Weight more heavily the dimensions that have data. If only mood check-ins exist, show mood trend, not a composite score
5. **Never show zero or arbitrary defaults:** The worst UX is showing "Health Score: 0" to a new user

**Detection (warning signs):**
- Health Score computation has no null/missing data handling
- No minimum data threshold before displaying
- Test cases only use users with complete data profiles

**Phase to address:** Health Score implementation phase (C1 workstream). Design the empty/sparse state BEFORE implementing the full computation.

**Confidence:** HIGH -- every new user will hit this. The backend-intelligence-upgrade.md C1 workstream focuses on the scoring formula but doesn't specify cold-start behavior.

---

### Pitfall 6: Partner Data Privacy Leak Through Inference

**What goes wrong:** The system exposes partner's private information indirectly, even though the explicit rule is "reference but no direct quotes." Analysis reveals partner's emotional state, behavioral patterns, or sensitive information through inference.

**Why it happens:**
- The architecture explicitly references partner data: `partner_perspective_inferred` in Balance Mediator, `partner_likely_emotion` in Emotion Interpreter, `speaker_dynamics` in audio data
- Even without direct quotes, saying "Your partner appears to feel overwhelmed and defensive when financial topics arise" reveals the partner's emotional patterns
- If User A records a conflict and gets analysis, then User B also records the same conflict, cross-referencing the two analyses could reconstruct each partner's full perspective
- The `TherapyDataCollector` aggregates data from both partners when couple context exists
- Safety assessment `risk_level` for one partner could be visible in the other's experience (e.g., suddenly losing couple features implies partner flagged as high-risk)

**Consequences:**
- Trust violation if partner feels monitored
- In abusive relationships, the abuser could use insights about partner's emotional patterns to manipulate more effectively
- Legal liability under PIPA (Korean Personal Information Protection Act) if partner's personal data is processed without explicit consent for that specific use
- Partner who discovers their emotional states are being analyzed without their direct input feels violated

**Prevention:**
1. **Strict one-way inference:** Never tell User A what User B "likely feels." Only tell User A how User A's WORDS might have been HEARD. This is the distinction between "Your partner is defensive" (privacy leak) and "These words could sound like an attack" (about User A's words)
2. **Separate data contexts:** When running analysis, NEVER include Partner B's conversation data in User A's analysis. Each user's analysis pipeline should only see their own data
3. **Safety gate opacity:** If couple features are disabled for safety reasons, show a generic message ("Some features are temporarily adjusted") not "Your partner has been flagged"
4. **No cross-referencing reports:** If both partners have insight reports about the same conflict, ensure the reports cannot be combined to reconstruct the other's perspective
5. **Audit the Balance Mediator prompt:** The mediator's "partner_perspective_inferred" output MUST be derived solely from what the USER said about their partner, never from the partner's own data
6. **PIPA consent:** Add explicit consent for "Your anonymized patterns may be used to improve your partner's analysis" during onboarding

**Detection (warning signs):**
- TherapyDataCollector queries partner's check-ins or conversations
- Balance Mediator prompt includes partner's own data (not just user's description of partner)
- Insight reports for User A contain information that could only come from User B's sessions

**Phase to address:** Intelligence data layer (Task 2) and analysis agents (Task 4). Must be designed into the data collection boundaries, not added as a filter after.

**Confidence:** HIGH -- the accumulative-therapy-system.md explicitly includes `partner_emotions` in ConflictInformation, derived from "user's description." But the TherapyDataCollector has access to the couple's shared data, and the line between "inferred from user's description" and "accessed from partner's data" is easy to accidentally cross.

---

### Pitfall 7: Korean LLM Therapy Prompt Quality Degradation

**What goes wrong:** Korean-language prompts for the therapeutic listener and analysis agents produce outputs that feel unnatural, culturally inappropriate, or therapeutically unsound. The system works well in testing with English inputs but fails with real Korean therapy conversations.

**Why it happens:**
- LLMs are primarily trained on English data. Korean therapy-specific vocabulary is underrepresented in training corpora
- Korean honorific system is context-dependent: the current plan mandates "격식체" (formal register) but real Korean therapy uses a specific warmth register between formal and casual that LLMs struggle with
- [LLMs show a "cognitive-affective gap"](https://arxiv.org/html/2502.11095v1) in mental health contexts -- they can be linguistically fluent but emotionally misaligned
- Korean cultural concepts like "nunchi" (reading the room), "jeong" (deep emotional bond), "chaekmyeon" (face-saving) don't have direct English equivalents and LLMs may not handle them well
- The 6 agent prompts are ALL in Korean, meaning prompt engineering quality depends on the LLM's Korean reasoning ability, not just its Korean output ability
- Temperature settings per agent (0.1-0.7) affect Korean text quality differently than English -- Korean natural speech requires more varied sentence endings, which lower temperatures suppress

**Consequences:**
- Users feel the AI "doesn't understand Korean" or "sounds like a translation"
- Therapeutic trust is broken when the AI uses awkward honorifics or misreads Korean emotional expression
- Korean indirect communication is interpreted literally, losing nuance
- Suggestions like "directly tell your partner how you feel" (direct communication) are culturally inappropriate in Korean context where indirect approaches are preferred

**Prevention:**
1. **Native Korean speaker evaluation:** Before shipping, have at least 2 native Korean speakers (ideally with counseling background) evaluate 20+ sample conversations for naturalness and therapeutic appropriateness
2. **Korean-specific prompt patterns:** Use Korean conversational structures, not translated English ones. Example: "~하시는 건 어떨까요?" (gentle suggestion) instead of "I suggest you..." pattern
3. **Cultural adaptation layer:** Add explicit cultural context to agent prompts: "In Korean culture, direct confrontation is often avoided. Reframe suggestions using indirect approaches."
4. **Temperature testing:** Test each agent's Korean output quality at multiple temperatures. The 0.3 temperature for Pattern Analyst may produce overly robotic Korean
5. **Test with real Korean conflict descriptions:** Use actual Korean couples' descriptions of conflicts (anonymized), not translated English examples
6. **Honorific consistency check:** Verify the AI maintains consistent register throughout a conversation. Mixing 반말 (casual) with 존댓말 (formal) is jarring and breaks trust
7. **Avoid English loanword overuse:** LLMs generating Korean therapy content often over-rely on Konglish (e.g., "커뮤니케이션" instead of natural Korean "소통")

**Detection (warning signs):**
- All prompt testing done with English or machine-translated inputs
- No native Korean speaker on the evaluation team
- Prompts are written in English first and translated to Korean
- No cultural adaptation beyond honorific level choice

**Phase to address:** Chat agent refactoring (Task 1) and analysis agents (Task 4). Quality must be validated BEFORE the feature flag is turned on for real users.

**Confidence:** MEDIUM -- Korean LLM capabilities have improved significantly, but the [therapy-specific domain](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1583739/full) remains a known weak point. Requires empirical validation with real Korean inputs.

---

### Pitfall 8: Feature Flag Combinatorial Explosion

**What goes wrong:** Multiple feature flags interact in unexpected ways, creating a matrix of untested states. The codebase becomes littered with conditional logic that's impossible to reason about.

**Why it happens:**
- v1.1 introduces at least 3 feature flags: `ACCUMULATIVE_THERAPY_ENABLED` (already in settings), `MULTI_AGENT_ENABLED` (from multi-agent plan), and likely per-feature flags for health score, push notifications, etc.
- The plans reference BOTH `ACCUMULATIVE_THERAPY_ENABLED` and `MULTI_AGENT_ENABLED`. These control DIFFERENT things but overlap: the accumulative flag changes chat behavior, the multi-agent flag changes the analysis pipeline
- With just 3 boolean flags, there are 8 possible states. The plan only tests 2 (all off = v1.0, all on = v1.1)
- [Feature flag best practices](https://octopus.com/devops/feature-flags/feature-flag-best-practices/) warn that "stale feature flags contribute to technical debt" and most flags should be removed within 2-4 weeks
- Backend flags and frontend behavior must be synchronized. If `ACCUMULATIVE_THERAPY_ENABLED=True` changes the backend response format, the mobile app must handle BOTH formats based on what the backend returns
- Mobile app versions can't be updated as quickly as backend flags -- users on old app versions will call the new backend

**Consequences:**
- Untested flag combinations cause subtle bugs (e.g., accumulative therapy ON but multi-agent OFF means chat agent is a listener but insight reports use old analysis)
- Technical debt accumulates as flag checks spread across the codebase
- Frontend crashes when backend returns unexpected format for a flag combination the frontend doesn't know about
- Debugging production issues requires knowing which flags are active, which is often not logged

**Prevention:**
1. **Reduce to ONE feature flag:** Merge `ACCUMULATIVE_THERAPY_ENABLED` and `MULTI_AGENT_ENABLED` into a single `INTELLIGENCE_V2_ENABLED` flag. The accumulative therapy paradigm and multi-agent pipeline are a PACKAGE -- there's no valid state where one is on and the other is off
2. **Feature flag lifecycle:** Plan the removal date at creation time. Each flag gets a removal ticket. Target: remove within 4 weeks of full rollout
3. **API versioning over feature flags for mobile:** Instead of the mobile app guessing which features are available, use an API endpoint (`/api/v1/capabilities/`) that returns what the backend supports. Mobile adapts to capability response
4. **Log active flags in every request:** Include active flag state in request metadata so debugging can correlate behavior with flag configuration
5. **Test the transition states:** Write tests for flag=False->True AND flag=True->False. Rolling back should be safe
6. **Never branch UI on backend flags:** The mobile app should handle any response format gracefully. If the backend returns `mode: "chat"` with no analysis, the frontend should show it correctly regardless of which pipeline generated it

**Detection (warning signs):**
- More than 3 feature flags planned
- No flag removal plan/dates
- Mobile app has `if (featureFlag)` conditional rendering
- Tests only cover all-flags-on and all-flags-off

**Phase to address:** Must be resolved during architecture/planning. Every phase that adds a feature flag must include its removal plan.

**Confidence:** HIGH -- the existing codebase already has `ACCUMULATIVE_THERAPY_ENABLED` in base.py, and the multi-agent plan adds `MULTI_AGENT_ENABLED`. The two plans were written independently and don't reconcile their flag strategies.

---

### Pitfall 9: Backend-Frontend API Contract Drift During Rapid Iteration

**What goes wrong:** The backend evolves rapidly across v1.1 phases, but the mobile app's TypeScript types, API calls, and adapters fall behind or diverge, causing runtime crashes that only appear on real devices.

**Why it happens:**
- This is a KNOWN issue in this codebase. Three separate documents exist to address it: `backend-intelligence-api-contract-v1.md`, `frontend-intelligence-ui-gap-v1.md`, and `intelligence-acceptance-matrix.md`
- The existing `types.ts` already shows the adapter pattern (`BackendInsightReportSummary` -> `InsightReportSummary`) specifically because the frontend and backend had different field names
- v1.1 adds new API responses: chat agent returns different shapes when accumulative mode is on (includes `checklist_update`, `phase`), insight reports API, health score API, recommendation API
- The mobile `api.ts` expects specific response shapes. If the backend adds a new field, TypeScript catches it at compile time -- but if the backend REMOVES or RENAMES a field, the app crashes at runtime when trying to access it
- Backend developer and frontend developer (or single developer doing both) may not update both sides atomically
- The existing `reframe_message` view returns different shapes for `mode: "chat"` vs `mode: "reframing"` -- this pattern multiplied across new endpoints is fragile

**Consequences:**
- App crashes on the reports screen because backend renamed `key_insights` to `insights`
- Chat screen shows blank messages because the new chat agent response format includes `checklist_update` but the frontend doesn't parse it
- Health Score shows "NaN" because the API returns `null` when data is insufficient but frontend expects a number
- Users on older app versions crash after backend upgrade
- These bugs only manifest on physical devices, not in web testing

**Prevention:**
1. **Single source of truth for API contracts:** Create a shared TypeScript schema file or OpenAPI spec that BOTH backend serializers and frontend types are generated from. At minimum, keep the `backend-intelligence-api-contract-v1.md` updated and mandate it as the contract
2. **Defensive frontend parsing:** EVERY API call must use the adapter pattern (already established in `adapters.ts`). Adapters must use nullish coalescing for EVERY field: `item.key_insights ?? item.insights ?? []`
3. **Backend response envelope:** Standardize all v1.1 API responses with a version field: `{ "api_version": "1.1", "data": {...} }`. Frontend can detect unexpected versions and show a "please update" prompt instead of crashing
4. **API contract tests:** Write integration tests that serialize a Django model, then attempt to parse it through the TypeScript adapter. Any mismatch is caught before deployment
5. **Backward compatibility period:** When renaming fields, keep BOTH old and new field names for at least 2 mobile app release cycles. The `backend-intelligence-api-contract-v1.md` already describes this with "compatibility fields retained"
6. **Mobile minimum version enforcement:** When a breaking API change ships, the backend should return HTTP 426 (Upgrade Required) to clients below a minimum version

**Detection (warning signs):**
- Frontend TypeScript types don't match backend serializer fields
- No adapter/normalization layer for new API endpoints
- Backend changes deployed without corresponding mobile release
- New API endpoint tested only with curl/Postman, not through the mobile app

**Phase to address:** Every phase that adds or modifies API endpoints. The contract alignment should be verified in each phase's acceptance criteria.

**Confidence:** HIGH -- this is a documented, existing problem in this codebase. The three plan documents addressing it prove it's already been identified as a gap. The risk is that rapid v1.1 iteration recreates the gap faster than the adapter pattern can close it.

---

### Pitfall 10: Push Notification Setup Failures in Expo

**What goes wrong:** Push notifications, critical for insight report delivery and engagement, fail silently on real devices despite working in development, or require a development build that breaks the existing Expo Go workflow.

**Why it happens:**
- [Expo push notifications require a development build](https://docs.expo.dev/push-notifications/push-notifications-setup/) -- they do NOT work in Expo Go. The current project likely uses Expo Go for development, meaning push notifications have never been tested
- [Push notifications don't work on emulators/simulators](https://docs.expo.dev/push-notifications/faq/) -- physical device testing is mandatory
- Android requires notification channels (Android 8+). Without channel configuration, notifications are silently dropped
- iOS requires explicit permission request AND provisioning profile with push notification entitlement
- Expo push token registration must happen EARLY (module top-level) on iOS, or [notifications received when app is killed won't be handled](https://docs.expo.dev/push-notifications/receiving-notifications/)
- The existing `mobile/package.json` already has `expo-notifications: ^0.32.16`, suggesting someone planned for this, but the module needs explicit configuration
- Push token must be sent to and stored on the backend -- this requires a new model/endpoint not yet in the codebase

**Consequences:**
- Insight reports complete but users never know (no notification)
- Users discover reports days later by manually checking the reports screen
- Push notification setup blocks app store submission (iOS requires push notification entitlement in provisioning profile)
- Android splash screen bug on notification launch (70% failure rate in debug builds per [Expo docs](https://medium.com/@gligor99/making-expo-notifications-actually-work-even-on-android-12-and-ios-206ff632a845))

**Prevention:**
1. **Switch to development build early:** Don't defer to the push notification phase. Set up `expo-dev-client` as the first infrastructure step, since all subsequent testing benefits from it
2. **Backend push token model:** Create a `PushToken` model (user, token, platform, created_at) and registration endpoint early. Don't hardcode tokens
3. **Android notification channels:** Configure channels at app startup: one for "Insight Reports" (high priority), one for "Daily Reminders" (default priority), one for "Partner Activity" (low priority)
4. **Test on physical devices from the push notification phase forward:** Do NOT assume "it works on simulator" means it works
5. **Graceful fallback:** If push registration fails, show an in-app banner on the home screen instead. Never depend solely on push for critical communication
6. **Register notification handler at module top-level:** Per Expo docs, the response handler must be registered outside of any component to catch cold-start notification taps on iOS

**Detection (warning signs):**
- Push notification code tested only in Expo Go
- No PushToken model in the backend
- Notification handler registered inside useEffect instead of module top-level
- No Android notification channel configuration

**Phase to address:** WS4-02 (Push notifications). But the development build switch should happen at v1.1 phase start.

**Confidence:** HIGH -- [Expo's official FAQ](https://docs.expo.dev/push-notifications/faq/) documents these exact issues. The fact that `expo-notifications` is already in `package.json` but no push token model exists in the backend confirms this is incomplete setup.

---

## Minor Pitfalls

Mistakes that cause friction but are manageable.

---

### Pitfall 11: Celery Beat Scheduling Collisions

**What goes wrong:** Multiple Celery beat tasks scheduled at similar times (analysis trigger evaluation at midnight, pattern analysis at midnight, health score computation at midnight) overwhelm the worker and Redis.

**Prevention:**
1. Stagger beat schedules: triggers at 00:00, health scores at 02:00, weekly reports at 04:00
2. Use `jitter` parameter in Celery beat to add randomness
3. Rate-limit user processing within tasks (batch 50 users at a time with 5-second delays)

**Phase to address:** Task 3 (Trigger Service) when configuring Celery beat.

---

### Pitfall 12: TherapyDataCollector N+1 Query Performance

**What goes wrong:** The data collector queries 7+ models for each user (conversations, messages, check-ins, patterns, audio, activities, weekly summaries). Without optimization, this creates N+1 queries per user, and trigger evaluation iterates over ALL active users.

**Prevention:**
1. Use `select_related` and `prefetch_related` aggressively
2. Add database indexes (already planned in CC6 of backend-intelligence-upgrade.md): compound index on `(user, pattern_type, created_at)` for Pattern model
3. Cache UserIntelligenceService results (planned, 5-minute TTL)
4. Batch queries: load all active users' recent check-ins in one query, not one query per user
5. Consider materialized views for health score components after PostgreSQL migration

**Phase to address:** Intelligence Data Layer (Task 2).

---

### Pitfall 13: In-Conversation Insight Delivery Timing

**What goes wrong:** The chat agent offers to share insights at awkward moments -- during emotional venting, at conversation start before rapport, or when the user is mid-thought. The "Would you like me to share what I've noticed?" prompt feels interrupting rather than natural.

**Prevention:**
1. Only offer insights after a natural pause (user hasn't typed for 30+ seconds) or at conversation end
2. Never offer insights if user's emotional intensity is above 7/10
3. Never offer in the first 3 messages of a new conversation
4. If user declines once, don't offer again in the same session
5. Track acceptance rate and adjust timing rules based on data

**Phase to address:** Task 5 (Insight Delivery).

---

### Pitfall 14: Accumulative System Memory Leak in ConflictInformation State

**What goes wrong:** The `ChatAgentState` with `ConflictInformation` tracking grows unbounded across long conversations. Lists like `key_quotes` and `user_emotions` accumulate without limits, eventually creating oversized LLM context windows.

**Prevention:**
1. Cap all list fields: `key_quotes` max 10, `user_emotions` max 20
2. Implement rolling window: keep only the 5 most recent quotes, oldest get summarized
3. Store conflict information in the database (per conversation), not just in memory state
4. Set max context window for the chat agent prompt (e.g., information_checklist_status max 500 tokens)

**Phase to address:** Task 1 (Chat Agent Refactoring).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| Chat Agent Refactoring | P1: Removing immediate gratification | Bridge UX with micro-insights, progress indicator | CRITICAL |
| Chat Agent Refactoring | P7: Korean prompt quality | Native speaker evaluation before flag-on | MODERATE |
| Chat Agent Refactoring | P4: asyncio.run() conflict | Convert to async views or fix event loop | CRITICAL |
| Intelligence Data Layer | P6: Partner privacy leak | Strict data boundary per user | MODERATE |
| Intelligence Data Layer | P12: N+1 queries | Prefetch + indexes + caching | MINOR |
| Analysis Trigger Service | P11: Beat scheduling collision | Stagger schedules, add jitter | MINOR |
| Analysis Graph (LangGraph) | P2: Production failures | Per-agent timeout, cost ceiling, circuit breaker | CRITICAL |
| Analysis Graph (LangGraph) | P8: Feature flag explosion | Merge into single flag | MODERATE |
| Insight Delivery | P13: Awkward timing | Rules-based delivery timing | MINOR |
| Health Score | P5: Cold start / sparse data | Progressive disclosure, confidence indicator | MODERATE |
| PostgreSQL Migration | P3: Encrypted data corruption | Custom ORM-based migration script | CRITICAL |
| Push Notifications | P10: Silent failures | Dev build switch, physical device testing | MODERATE |
| API Contract Alignment | P9: Frontend-backend drift | Adapter pattern, contract tests, version envelope | MODERATE |
| Feature Flags | P8: Combinatorial explosion | Single flag, removal plan | MODERATE |

---

## Sources

### LangGraph Production
- [LangGraph deployment timeout errors - GitHub #4620](https://github.com/langchain-ai/langgraph/issues/4620)
- [LangGraph "can't start a new thread" - GitHub #2873](https://github.com/langchain-ai/langgraph/issues/2873)
- [LangGraph timeout errors - GitHub #4927](https://github.com/langchain-ai/langgraph/issues/4927)
- [LangChain in Production: Beyond the Tutorials](https://medium.com/@kasimoluwasegun/langchain-in-production-beyond-the-tutorials-e7b7f2506572)
- [Scaling AI Agents in Django SaaS: LangGraph + Celery](https://medium.com/django-journal/scaling-ai-agents-in-django-saas-langgraph-celery-for-autonomous-workflows-at-1m-users-f6d7a274838c)
- [asyncio.run() event loop conflict - langchain #8494](https://github.com/langchain-ai/langchain/issues/8494)

### Django SQLite to PostgreSQL Migration
- [Django Forum: Migrating from SQLite to PostgreSQL](https://forum.djangoproject.com/t/migrating-from-sqlite-to-postgresql/29128)
- [How to migrate Django from SQLite to PostgreSQL](https://gist.github.com/sirodoht/f598d14e9644e2d3909629a41e3522ad)
- [I Migrated My Django App to PostgreSQL - Everything I Wish I Knew](https://mojtabaazad.medium.com/i-migrated-my-django-app-to-postgresql-and-heres-everything-i-wish-i-knew-5f1797385cc1)
- [django-fernet-fields documentation](https://django-fernet-fields.readthedocs.io/en/latest/)

### Expo Push Notifications
- [Expo: Push notifications troubleshooting FAQ](https://docs.expo.dev/push-notifications/faq/)
- [Expo: What you need to know about notifications](https://docs.expo.dev/push-notifications/what-you-need-to-know/)
- [Making Expo Notifications Actually Work](https://medium.com/@gligor99/making-expo-notifications-actually-work-even-on-android-12-and-ios-206ff632a845)
- [Expo: Receiving notifications - handler registration](https://docs.expo.dev/push-notifications/receiving-notifications/)

### Korean LLM and Therapy
- [Aligning LLMs for CBT: Proof-of-concept study (Frontiers)](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1583739/full)
- [Survey of LLMs in Psychotherapy](https://arxiv.org/html/2502.11095v1)
- [Prompt Engineering Framework for Mental Health Chatbots (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12594504/)
- [2026 Korean CSAT LLM Evaluation Leaderboard](https://www.emergentmind.com/topics/2026-korean-csat-llm-evaluation-leaderboard)

### Feature Flags
- [12 Commandments of Feature Flags 2025](https://octopus.com/devops/feature-flags/feature-flag-best-practices/)
- [Frontend vs Backend Feature Flags](https://configcat.com/blog/2025/05/08/frontend-vs-backend-feature-flags/)
- [11 Principles for Feature Flag Systems](https://docs.getunleash.io/guides/feature-flag-best-practices)

### Cold Start and Sparse Data
- [Cold Start Problem in ML Explained](https://spotintelligence.com/2024/02/08/cold-start-problem-machine-learning/)
- [Progressive Bayesian Architectures for Cold-Start Health Analytics](https://arxiv.org/html/2601.03299)

### Privacy
- [Dating Apps Leak User Data (Dark Reading)](https://www.darkreading.com/application-security/swipe-right-for-data-leaks-dating-apps-expose-location-more)
- [AI Companion App Breach - 400K Users (Cybernews)](https://cybernews.com/security/ai-girlfriend-app-leak-exposes-400k-users/)
