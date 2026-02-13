# Codebase Concerns

**Analysis Date:** 2026-02-13

## Tech Debt

**Consent State Management (Type Mismatch Bug):**
- Issue: User ID type comparison fails when comparing backend integer with frontend string
- Files: `mobile/src/hooks/useRecordingConsent.ts` (lines 121, 135, 151)
- Impact: Requester processes their own consent broadcast, causing both consent indicators to show "consented" when only one user consented (GAP-7 bug)
- Fix approach: Add `Number()` type coercion to all user ID comparisons in WebSocket message handlers

**Phase State Synchronization (Responder Bug):**
- Issue: Phase transition logic in `useLiveRecording.ts` only checks for `phase === 'waiting_consent'` but responder never sets this phase
- Files: `mobile/src/features/recording/hooks/useLiveRecording.ts` (lines 74-91)
- Impact: When both users consent, responder's phase stays at 'requesting_consent', preventing transition to 'consent_granted' (GAP-8 bug)
- Fix approach: Update phase transition effect to accept both 'waiting_consent' and 'requesting_consent' states, or set responder's phase correctly when receiving consent request

**Delete Recording Existence Leak:**
- Issue: Delete endpoint fetches recording without user filter, then checks ownership manually
- Files: `backend/apps/audio/views.py` (line 282)
- Impact: Returns 403 (forbidden) for other user's recordings vs 404 (not found) for non-existent recordings, leaking existence information
- Fix approach: Use `.filter(user=request.user)` in initial query to return 404 for all unauthorized access

**Mobile/Backend API Contract Mismatch:**
- Issue: Mobile sends POST to `/users/me/data-export/` but backend only accepts GET
- Files: `mobile/src/app/(main)/privacy-settings.tsx` (line 20), `backend/apps/users/views.py` (line 14)
- Impact: Returns 405 Method Not Allowed error when user requests data export
- Fix approach: Change mobile to use `api.get()` instead of `api.post()` (backend is correct per REST conventions)

**Insecure Default Secret Key:**
- Issue: Default Django SECRET_KEY includes 'django-insecure-' prefix
- Files: `backend/config/settings/base.py` (line 31)
- Impact: If `.env` file is missing, application runs with a hardcoded insecure key committed to git
- Fix approach: Remove default value and fail-fast if DJANGO_SECRET_KEY env var is not set

**Empty Return Values (Placeholder Implementations):**
- Issue: Multiple service methods return empty dicts/lists instead of implementing functionality
- Files: `backend/apps/patterns/services/detector.py` (lines 65, 88, 119, 134, 137), `backend/apps/intelligence/services/analysis_graph.py` (lines 144, 174, 183, 194), `backend/apps/activities/services/effectiveness.py` (line 40), `backend/apps/activities/services/recommendations.py` (lines 246, 261)
- Impact: Features silently fail to work or return no data; difficult to distinguish between "no results" and "not implemented"
- Fix approach: Either implement functionality or raise NotImplementedError to make placeholder status explicit

**Silent Exception Handling (Pass Statements):**
- Issue: Multiple try-except blocks with bare `pass` statements suppress errors
- Files: `backend/apps/activities/views.py` (line 153), `backend/apps/couples/services/partner_dashboard.py` (line 47), `backend/apps/patterns/services/health_score.py` (lines 156, 329), `backend/apps/intelligence/services/trigger_service.py` (lines 108, 197), `backend/apps/intelligence/services/data_collector.py` (lines 156, 267, 378), `backend/apps/intelligence/services/analysis_graph.py` (line 291)
- Impact: Errors are swallowed silently, making debugging difficult; system may fail partially without indication
- Fix approach: Add logging statements before `pass` or handle specific exceptions with appropriate fallback behavior

**Console Logging in Production Code:**
- Issue: 30 console.log/error/warn statements across 16 mobile source files
- Files: `mobile/src/lib/auth.ts`, `mobile/src/hooks/useRecordingConsent.ts`, `mobile/src/services/notifications.ts`, `mobile/src/features/chat/hooks/useVoiceInput.ts`, and 12 others
- Impact: Sensitive data may be logged to browser console; no centralized logging strategy; performance overhead
- Fix approach: Replace with structured logging service (e.g., Sentry breadcrumbs) or remove debug logs

## Known Bugs

**GAP-7: Home Screen Consent Shows Both Consented When Only One Consents:**
- Symptoms: On home screen "갈등 녹음" flow, when one user initiates consent, both consent circles show green checkmarks
- Files: `mobile/src/hooks/useRecordingConsent.ts` (line 121)
- Trigger: Initiate consent from home screen, observe both users shown as consented immediately
- Workaround: None - breaks consent flow integrity

**GAP-8: Record Tab Both Consented But Stays in Waiting State:**
- Symptoms: In "함께 녹음하기" flow, even when both users consent, UI stays in "동의 대기중" state
- Files: `mobile/src/features/recording/hooks/useLiveRecording.ts` (lines 74-91)
- Trigger: Both users click "동의하기" in live recording consent flow
- Workaround: None - prevents starting live recording

**Detailed Bug Analysis:**
- Root cause diagnosis available in `.planning/debug/consent-state-bugs.md`
- Bugs are in two separate code paths (home screen uses DualConsentPrompt, record tab uses LiveConsentFlow)
- Both stem from state management issues in `useRecordingConsent` hook

## Security Considerations

**WebSocket Authentication Bypass Risk:**
- Risk: WebSocket consumers check `scope['user'].is_authenticated` but lack additional authorization
- Files: `backend/apps/consents/consumers.py` (line 26-33)
- Current mitigation: Couple-based room groups prevent cross-couple access
- Recommendations: Add rate limiting on consent requests, implement session-based abuse detection

**No Rate Limiting on API Endpoints:**
- Risk: Documented test cases mention throttling but no global rate limiting detected
- Files: `backend/apps/users/tests.py` mentions ThrottleMixin (line 577)
- Current mitigation: Appears to be per-view throttling, not comprehensive
- Recommendations: Implement DRF throttling classes globally for authenticated users, add stricter limits for LLM-heavy endpoints

**API Keys in Environment Variables:**
- Risk: Multiple LLM provider API keys required in environment
- Files: `backend/apps/chat/services/llm_service.py` (lines 27, 46, 65, 88)
- Current mitigation: Using environment variables (better than hardcoding)
- Recommendations: Document required env vars in deployment guide, consider secrets management service for production

**Default DEBUG=True in Base Settings:**
- Risk: Base settings file sets DEBUG=True (line 34)
- Files: `backend/config/settings/base.py` (line 34)
- Current mitigation: Environment-specific settings override this (development.py, production.py)
- Recommendations: Remove default from base.py and require explicit setting in environment configs

## Performance Bottlenecks

**Large Test Files (1200+ Lines):**
- Problem: Single test file exceeds 1200 lines
- Files: `backend/apps/chat/tests.py` (1285 lines)
- Cause: All chat-related tests in one file
- Improvement path: Split into multiple files by feature area (conversations, messages, reframing, streaming, etc.)

**Sequential LLM Calls in Analysis Pipeline:**
- Problem: Multi-agent analysis runs 5 agents sequentially in LangGraph
- Files: `backend/apps/intelligence/services/analysis_graph.py` (lines 86-102)
- Cause: Comment states "LangGraph sync invoke doesn't support asyncio" so parallel_analysis_node runs sequentially
- Improvement path: Investigate async LangGraph executor or refactor to use asyncio.gather for independent agent calls

**No Database Query Optimization Detected:**
- Problem: Potential N+1 queries in data collection for analysis
- Files: `backend/apps/intelligence/services/data_collector.py` (404 lines of data fetching)
- Cause: Multiple separate queries across different models
- Improvement path: Add select_related/prefetch_related, profile with django-debug-toolbar

**Client-Side Console Logging Overhead:**
- Problem: 30 console.log statements in production mobile build
- Files: Multiple files across `mobile/src/`
- Cause: Debug logging not stripped in production builds
- Improvement path: Use conditional logging (only in __DEV__), configure metro bundler to strip console.* calls

## Fragile Areas

**WebSocket Consent Flow:**
- Files: `backend/apps/consents/consumers.py`, `mobile/src/hooks/useRecordingConsent.ts`
- Why fragile: Complex state synchronization between two users via WebSocket; type mismatches cause silent failures; difficult to test
- Safe modification: Always test with two devices/browsers; add comprehensive integration tests; document WebSocket message contract
- Test coverage: Limited - mostly manual UAT coverage

**Multi-Agent LangGraph Pipeline:**
- Files: `backend/apps/intelligence/services/analysis_graph.py`, all files in `backend/apps/intelligence/services/agents/`
- Why fragile: 7 chained LLM calls with state passing; JSON parsing from LLM responses; ethics guardian can block entire pipeline
- Safe modification: Add extensive logging at each node; validate state schema at transitions; test with mock LLM responses
- Test coverage: No unit tests detected for agent nodes

**Mobile Authentication Flow:**
- Files: `mobile/src/hooks/useAuth.tsx`, `mobile/src/lib/auth.ts`
- Why fragile: JWT token refresh logic; race conditions between token expiry and API calls; user ID type inconsistencies
- Safe modification: Test token refresh edge cases; ensure all user ID comparisons use consistent types
- Test coverage: No mobile unit tests detected

**Audio Recording State Machine:**
- Files: `mobile/src/features/recording/hooks/useAudioRecording.ts`, `mobile/src/features/recording/hooks/useLiveRecording.ts`
- Why fragile: Complex phase state machine ('requesting_consent' → 'waiting_consent' → 'consent_granted' → 'recording' → ...); consent bugs show phase transition failures
- Safe modification: Document complete state diagram; add state validation; test all transition paths
- Test coverage: Known bugs in UAT indicate insufficient coverage

## Scaling Limits

**Synchronous LLM Analysis Pipeline:**
- Current capacity: One analysis job per trigger, runs synchronously
- Limit: Cannot handle multiple concurrent insight report generations
- Scaling path: Move to Celery task queue (already installed in requirements.txt but not used for analysis), add async LangGraph support

**In-Memory WebSocket Connections:**
- Current capacity: Channels with Redis backend handles couple-based groups
- Limit: All active WebSocket connections consume server memory
- Scaling path: Already using channels-redis (line 8 in requirements.txt) which is horizontally scalable

**File Storage Not Configured:**
- Current capacity: Audio files presumably stored locally or in database
- Limit: Disk space on application server
- Scaling path: Migrate to cloud storage (S3, GCS) with presigned URLs for upload/download

## Dependencies at Risk

**expo-av Deprecated:**
- Risk: Mobile app uses expo-av v16.0.8 (line 18 in mobile/package.json)
- Impact: Planning documents (`.planning/research/STACK.md`) note expo-av deprecated in SDK 53, will be removed in SDK 55
- Migration plan: Planning docs recommend migrating to expo-audio; migration not yet implemented in code

**LangChain Rapid Version Changes:**
- Risk: Using langchain >=0.3.0 which had breaking changes
- Impact: Future upgrades may break agent implementations
- Migration plan: Pin exact versions in production, test upgrades in staging environment

**Django 5.x New Release:**
- Risk: Using Django >=5.0,<6.0 (line 1 in requirements.txt)
- Impact: Django 5.0 introduced changes to async support and ORM
- Migration plan: Currently acceptable; monitor Django security releases closely

## Missing Critical Features

**No Push Notifications Implementation:**
- Problem: exponent-server-sdk installed (line 40 in backend/requirements.txt), but no actual push notification sending code detected
- Blocks: Partner awareness when recording starts; consent request notifications; insight report delivery
- Comments in code show "TODO: Send push notification" at multiple points

**No Audio Transcription Service:**
- Problem: `backend/apps/audio/services/transcription.py` contains only `pass` statement (line 18)
- Blocks: Cannot generate transcripts from audio recordings; entire audio analysis pipeline is blocked
- OpenAI SDK installed (line 25 in requirements.txt) for Whisper API but not connected

**No Analytics/Observability:**
- Problem: Sentry SDK installed (line 17 in requirements.txt) but no configuration detected
- Blocks: Cannot track errors in production; no performance monitoring; difficult to diagnose user issues

**No Database Migrations Strategy:**
- Problem: 58KB of migrations in chat app, 45KB in patterns, 34KB in prompts
- Blocks: Squashing migrations becomes risky; deployment time increases
- Priority: Medium - not urgent but will become painful

## Test Coverage Gaps

**Mobile App Has No Unit Tests:**
- What's not tested: All mobile TypeScript/React code (0 test files found)
- Files: Entire `mobile/src/` directory
- Risk: Type bugs like user ID comparison go undetected; refactoring is risky; regression bugs likely
- Priority: High

**Backend Services Lack Unit Tests:**
- What's not tested: Intelligence agents, pattern detection, LLM service wrappers
- Files: `backend/apps/intelligence/services/agents/*.py` (5 agent files), `backend/apps/patterns/services/detector.py`, `backend/apps/chat/services/llm_service.py`
- Risk: LLM integration failures silent; pattern detection accuracy unknown; cannot refactor safely
- Priority: High

**WebSocket Consumers Not Tested:**
- What's not tested: Real-time consent synchronization, recording lifecycle events
- Files: `backend/apps/consents/consumers.py` (392 lines)
- Risk: Known consent bugs (GAP-7, GAP-8) indicate insufficient testing; state synchronization failures hard to catch
- Priority: Critical - two active bugs in this area

**Integration Tests Missing:**
- What's not tested: Full consent flow with two users, audio recording → transcription → analysis pipeline, multi-agent analysis end-to-end
- Files: No integration test directory structure detected
- Risk: Component tests pass but integration fails; UAT discovers bugs late in cycle
- Priority: High

---

*Concerns audit: 2026-02-13*
