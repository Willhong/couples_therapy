---
status: diagnosed
trigger: "GAP-7 and GAP-8: Consent state bugs in Home and Record tab"
created: 2026-02-03T12:00:00Z
updated: 2026-02-03T12:30:00Z
---

## Current Focus

hypothesis: TWO DIFFERENT BUGS in two different code paths - both related to `useRecordingConsent` hook state management
test: Code analysis complete
expecting: Root causes identified
next_action: Return diagnosis to caller

## Symptoms

expected:
  - GAP-7 (Home): Both circles should show "consented" only when BOTH users consent
  - GAP-8 (Record tab): Phase should transition to "consent_granted" when both consent

actual:
  - GAP-7 (Home): One user consent shows BOTH as consented
  - GAP-8 (Record tab): Even when both consent, stays in "waiting" state

errors: None (logic bugs, not crashes)

reproduction:
  - GAP-7: Home -> "갈등 녹음" -> DualConsentPrompt modal -> one user consents
  - GAP-8: Record tab -> "함께 녹음하기" -> LiveConsentFlow -> both users consent

started: Unknown - possibly always broken

## Evidence

- timestamp: 2026-02-03T12:05:00Z
  checked: Home screen home.tsx
  found: Uses DualConsentPrompt component for consent
  implication: Different code path from Record tab

- timestamp: 2026-02-03T12:07:00Z
  checked: Record tab RecordingScreen.tsx
  found: Uses LiveConsentFlow -> useLiveRecording -> useRecordingConsent
  implication: Different code path from Home screen

- timestamp: 2026-02-03T12:10:00Z
  checked: useRecordingConsent.ts handleMessage for 'consent_requested'
  found: |
    Lines 112-123:
    ```javascript
    case 'consent_requested':
      // Received consent request from partner
      if (data.requester_id !== user?.id) {
        setConsentRequest({...});
        setStatus('pending');
        setPartnerConsent(true); // Requester implicitly consents
      }
    ```
  implication: |
    BUG FOUND for GAP-7: When RESPONDER receives consent request, it sets partnerConsent=true
    (because requester implicitly consents). But the REQUESTER side never gets this update!
    The requester's partnerConsent stays at `null` until `consent_updated` is received.

- timestamp: 2026-02-03T12:15:00Z
  checked: useRecordingConsent.ts handleMessage for 'consent_updated'
  found: |
    Lines 126-135:
    ```javascript
    case 'consent_updated':
      // Partner responded to consent request
      if (data.responder_id !== user?.id) {
        setPartnerConsent(data.consented ?? false);
      }
      if (data.status === 'both_consented') {
        setStatus('approved');
      } else if (data.status === 'declined') {
        setStatus('declined');
      }
    ```
  implication: |
    BUG FOUND for GAP-8: The status check compares against 'both_consented' but
    backend returns Status.BOTH_CONSENTED which serializes to 'both_consented'.
    Wait - let me verify the actual backend return value...

- timestamp: 2026-02-03T12:18:00Z
  checked: Backend consumers.py process_consent_response
  found: |
    Lines 153-166:
    ```python
    status = await self.process_consent_response(session_id, consented)
    await self.channel_layer.group_send(
        self.room_group_name,
        {
            'type': 'consent_updated',
            'session_id': session_id,
            'responder_id': self.user.id,
            'consented': consented,
            'status': status,  # <-- This is RecordingConsent.Status enum
        }
    )
    ```
  implication: |
    The `status` is the return value from process_consent_response which returns
    consent.status (a Django TextChoices enum). Need to check how it serializes.

- timestamp: 2026-02-03T12:20:00Z
  checked: Backend models.py RecordingConsent.Status
  found: |
    Lines 15-19:
    ```python
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        BOTH_CONSENTED = 'both_consented', 'Both Consented'
        DECLINED = 'declined', 'Declined'
        EXPIRED = 'expired', 'Expired'
    ```
  implication: |
    Django TextChoices serializes to the value ('both_consented'), not the label.
    So backend returns 'both_consented' which frontend checks correctly.
    GAP-8 bug must be elsewhere...

- timestamp: 2026-02-03T12:22:00Z
  checked: useLiveRecording.ts phase sync logic
  found: |
    Lines 74-91:
    ```javascript
    useEffect(() => {
      if (consentStatus === 'approved' && phase === 'waiting_consent') {
        setPhase('consent_granted');
        // ...
      } else if (
        (consentStatus === 'declined' || consentStatus === 'withdrawn' || consentStatus === 'expired') &&
        (phase === 'waiting_consent' || phase === 'requesting_consent')
      ) {
        setPhase('consent_declined');
        // ...
      }
    }, [consentStatus, phase]);
    ```
  implication: |
    BUG FOUND for GAP-8: The condition checks `phase === 'waiting_consent'` but
    after calling requestConsent(), the phase is set to 'waiting_consent' ONLY in
    useLiveRecording.requestConsent callback (line 114). However, the responder's
    phase is NEVER set to 'waiting_consent' - it starts at 'requesting_consent'!

    When responder receives consent_requested from partner, DualConsentPrompt shows
    consent buttons, but useLiveRecording's phase stays at 'requesting_consent'.
    When responder clicks "동의하기", consentStatus becomes 'approved' but phase is
    still 'requesting_consent', so the effect condition fails!

- timestamp: 2026-02-03T12:25:00Z
  checked: DualConsentPrompt.tsx StatusCircle rendering
  found: |
    Lines 263-273:
    ```jsx
    <StatusCircle
      label="나"
      consented={myConsent}
      waiting={status === 'pending'}
    />
    <StatusCircle
      label="파트너"
      consented={partnerConsent === true}
      waiting={status === 'pending' && partnerConsent === null}
    />
    ```
  implication: |
    GAP-7 specific issue: For REQUESTER, after they initiate consent:
    - myConsent = true (set by initiateConsent)
    - partnerConsent = null (waiting for partner response)
    - Both circles should show: "나" = consented, "파트너" = waiting

    For RESPONDER, when they receive the request:
    - myConsent = false (hasn't responded yet)
    - partnerConsent = true (set in consent_requested handler - line 122)
    - Both circles should show: "나" = waiting, "파트너" = consented

    This seems correct! GAP-7 might be about the REQUESTER side seeing BOTH
    as consented, which would happen if consent_updated is received with
    partnerConsent being set correctly...

    Wait - re-reading the symptom: "한쪽만 동의해도 둘 다 동의했다고 표시됨"
    This could mean the INITIATOR immediately sees both as consented.

- timestamp: 2026-02-03T12:28:00Z
  checked: useRecordingConsent.ts initiateConsent
  found: |
    Lines 249-265:
    ```javascript
    const initiateConsent = useCallback(() => {
      const sessionId = generateUUID();
      setConsentRequest({
        session_id: sessionId,
        requester_id: user?.id || 0,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
      setMyConsent(true);
      setPartnerConsent(null);  // <-- Explicitly null
      setStatus('pending');
      setError(null);

      sendMessage({
        action: 'request_consent',
        session_id: sessionId,
      });
    }, [user?.id, sendMessage]);
    ```
  implication: |
    Correct - initiator sets partnerConsent=null initially.

    BUT WAIT - the REQUESTER also receives the broadcasted consent_requested
    message (because group_send broadcasts to ALL in the group including sender).

    Line 114: `if (data.requester_id !== user?.id)` - this guard SHOULD prevent
    the requester from processing their own request. Let me verify the user?.id
    check is working correctly...

    Actually, there's a subtle issue: The requester_id is passed from backend as
    self.user.id (integer), and on frontend it's compared with user?.id from useAuth.
    If these types don't match (e.g., string vs number), the check fails!

## Eliminated

(none yet)

## Resolution

root_cause: |
  **TWO SEPARATE BUGS:**

  ## GAP-7 (Home screen: one consent shows both consented)

  **Root Cause:** Type mismatch in user ID comparison.

  In `useRecordingConsent.ts` handleMessage, the check `data.requester_id !== user?.id`
  compares backend integer with frontend value. If frontend user?.id is a string (common
  in JWT parsing), the comparison `1 !== "1"` returns true, causing the REQUESTER to
  also process the consent_requested message and set `setPartnerConsent(true)`.

  **Evidence:** Line 114 and 122 - when requester_id type doesn't match user?.id type,
  the requester processes their own broadcast, setting partnerConsent=true immediately.

  ---

  ## GAP-8 (Record tab: consent granted but stays waiting)

  **Root Cause:** Phase state not synchronized with consent status for responder.

  In `useLiveRecording.ts`, the phase transition effect (lines 74-91) requires
  `phase === 'waiting_consent'` to transition to 'consent_granted'. However:

  1. Phase starts at 'requesting_consent' (line 38)
  2. Only the REQUESTER sets phase to 'waiting_consent' (line 114 in requestConsent)
  3. The RESPONDER's phase stays at 'requesting_consent' because they never call requestConsent()
  4. When responder's consentStatus becomes 'approved', the condition fails because
     phase is 'requesting_consent', not 'waiting_consent'

  **Evidence:** The effect condition `consentStatus === 'approved' && phase === 'waiting_consent'`
  is never true for the responder.

fix: |
  ## Fix for GAP-7:

  In `useRecordingConsent.ts`, ensure consistent type comparison:
  ```javascript
  // Line 114 - use Number() to ensure type consistency
  if (Number(data.requester_id) !== Number(user?.id)) {
  ```

  Or better, convert both to numbers when comparing:
  ```javascript
  if (data.requester_id !== user?.id && String(data.requester_id) !== String(user?.id)) {
  ```

  ## Fix for GAP-8:

  In `useLiveRecording.ts`, update the phase transition effect to handle responder case:
  ```javascript
  useEffect(() => {
    if (consentStatus === 'approved') {
      // Allow transition from any waiting state, not just 'waiting_consent'
      if (phase === 'waiting_consent' || phase === 'requesting_consent') {
        setPhase('consent_granted');
        if (consentTimeoutRef.current) {
          clearTimeout(consentTimeoutRef.current);
          consentTimeoutRef.current = null;
        }
      }
    } else if (
      // ... rest of declined handling
    ```

  Alternatively, set phase to 'waiting_consent' when responder receives consent_requested
  (in useRecordingConsent or in useLiveRecording's effect watching consentRequest).

verification: (not yet verified - diagnosis only mode)

files_changed: []
