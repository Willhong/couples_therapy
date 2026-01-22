---
phase: 01-foundation-safety
plan: 01
subsystem: auth, api, database
tags: [django, jwt, channels, fernet, dj-rest-auth, allauth, email-auth]

# Dependency graph
requires: []
provides:
  - Django 5.x backend with split settings configuration
  - Custom User model with email-only authentication
  - JWT authentication with simplejwt (30min access, 7day refresh)
  - Couple and InviteCode models for partner linking
  - RecordingConsent model with encrypted IP fields
  - DisclaimerConsent model for legal audit trail
  - WebSocket JWT middleware for Channels
affects: [02-core-reframing, 01-02-PLAN, 01-03-PLAN]

# Tech tracking
tech-stack:
  added:
    - Django 5.x
    - djangorestframework 3.16
    - djangorestframework-simplejwt 5.5
    - dj-rest-auth 7.0
    - django-allauth 65.14
    - Django Channels 4.3
    - channels-redis 4.3
    - daphne 4.2
    - djfernet (fernet-fields) 0.8.1
    - django-cors-headers 4.9
  patterns:
    - Email-only authentication (no username field)
    - JWT with token rotation and blacklisting
    - Split settings (base/development/production)
    - App-based Django structure (apps/users, apps/couples, etc.)
    - Encrypted fields for sensitive data (IP addresses)

key-files:
  created:
    - backend/apps/users/models.py
    - backend/apps/couples/models.py
    - backend/apps/consents/models.py
    - backend/apps/users/serializers.py
    - backend/apps/couples/views.py
    - backend/apps/core/middleware.py
    - backend/apps/core/permissions.py
    - backend/config/settings/base.py
    - backend/config/settings/development.py
  modified:
    - backend/config/urls.py
    - backend/config/asgi.py

key-decisions:
  - "Email-only auth: Removed username field entirely from User model, using email as USERNAME_FIELD"
  - "Custom RegisterSerializer: Replaced dj-rest-auth's RegisterSerializer to work without username"
  - "allauth.socialaccount required: dj_rest_auth.registration requires socialaccount even for non-social auth"
  - "fernet_fields import: djfernet package uses 'fernet_fields' as import path"
  - "ACCOUNT_USER_MODEL_USERNAME_FIELD = None: Required for allauth to work without username"

patterns-established:
  - "Korean error messages: All user-facing API errors use Korean text"
  - "Encrypted sensitive fields: IP addresses use EncryptedTextField for privacy"
  - "6-char invite codes: Exclude confusing chars (0, O, 1, I)"
  - "24-hour code expiration: InviteCode expires_at set on creation"
  - "JWT in WebSocket: Token passed via query string parameter"

# Metrics
duration: 13min
completed: 2026-01-23
---

# Phase 1 Plan 01: Django Backend Foundation Summary

**Django 5.x backend with email-only JWT auth, Couple/InviteCode models, and RecordingConsent with encrypted fields using fernet**

## Performance

- **Duration:** 13 min
- **Started:** 2026-01-22T17:42:05Z
- **Completed:** 2026-01-22T17:54:53Z
- **Tasks:** 3
- **Files modified:** 23+

## Accomplishments
- Django 5.x project with split settings (base/development) and all dependencies installed
- Custom User model using email as USERNAME_FIELD with disclaimer tracking fields
- JWT authentication with 30min access tokens and 7day refresh tokens (rotation enabled)
- Couple and InviteCode models for partner linking with 24-hour code expiration
- RecordingConsent model with encrypted IP address fields using fernet
- API endpoints for registration, login, invite code generation/redemption
- WebSocket JWT authentication middleware for Django Channels

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Django project with dependencies** - `6681d47` (feat)
2. **Task 2: Create User model and authentication serializers** - `67508bc` (feat)
3. **Task 3: Create Couple, InviteCode, and Consent models with API** - `6642249` (feat)

## Files Created/Modified
- `backend/apps/users/models.py` - Custom User model with email auth
- `backend/apps/users/serializers.py` - CustomRegisterSerializer for email-only auth
- `backend/apps/users/admin.py` - Custom UserAdmin
- `backend/apps/users/urls.py` - JWT token endpoints
- `backend/apps/couples/models.py` - Couple and InviteCode models
- `backend/apps/couples/views.py` - InviteCodeViewSet and CoupleViewSet
- `backend/apps/couples/serializers.py` - Serializers with deep_link field
- `backend/apps/couples/urls.py` - Router configuration
- `backend/apps/consents/models.py` - RecordingConsent and DisclaimerConsent
- `backend/apps/consents/serializers.py` - Consent serializers
- `backend/apps/core/middleware.py` - JWTAuthMiddleware for WebSocket
- `backend/apps/core/permissions.py` - IsCouplePartner, IsConsentParticipant
- `backend/config/settings/base.py` - Full Django settings with JWT, Channels, Fernet
- `backend/config/settings/development.py` - Dev-specific settings
- `backend/config/urls.py` - API v1 URL structure
- `backend/config/asgi.py` - ASGI with ProtocolTypeRouter

## Decisions Made
1. **Email-only authentication:** Removed username field entirely from User model. Used email as USERNAME_FIELD. Required custom RegisterSerializer that doesn't inherit from dj-rest-auth's RegisterSerializer because it expects username.

2. **allauth.socialaccount:** Added to INSTALLED_APPS even though not using social auth - dj_rest_auth.registration requires it for import.

3. **ACCOUNT_USER_MODEL_USERNAME_FIELD = None:** Critical setting for allauth to work without username field.

4. **fernet_fields import path:** djfernet package installs as fernet_fields, not djfernet.

5. **Korean error messages:** All user-facing API errors (validation, not found, etc.) use Korean text as specified in CONTEXT.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] djfernet package version**
- **Found during:** Task 1 (dependency installation)
- **Issue:** Plan specified djfernet>=0.9 but only 0.8.1 is available
- **Fix:** Changed requirement to djfernet>=0.8
- **Files modified:** backend/requirements.txt
- **Verification:** Dependencies installed successfully
- **Committed in:** 6681d47 (Task 1 commit)

**2. [Rule 3 - Blocking] fernet_fields import path**
- **Found during:** Task 2 (consents models)
- **Issue:** Tried importing from djfernet.fields but package uses fernet_fields
- **Fix:** Changed import to `from fernet_fields.fields import EncryptedTextField`
- **Files modified:** backend/apps/consents/models.py
- **Verification:** Models import successfully
- **Committed in:** 67508bc (Task 2 commit)

**3. [Rule 3 - Blocking] allauth.socialaccount missing**
- **Found during:** Task 3 (URL configuration)
- **Issue:** dj_rest_auth.registration imports socialaccount models
- **Fix:** Added allauth.socialaccount to INSTALLED_APPS
- **Files modified:** backend/config/settings/base.py
- **Verification:** Django check passes
- **Committed in:** 6642249 (Task 3 commit)

**4. [Rule 3 - Blocking] Username field in RegisterSerializer**
- **Found during:** Task 3 (verification)
- **Issue:** dj-rest-auth's RegisterSerializer requires username but our User model has none
- **Fix:** Created completely custom RegisterSerializer without inheriting from dj-rest-auth
- **Files modified:** backend/apps/users/serializers.py
- **Verification:** Registration API works with email only
- **Committed in:** 6642249 (Task 3 commit)

**5. [Rule 3 - Blocking] ACCOUNT_USER_MODEL_USERNAME_FIELD setting**
- **Found during:** Task 3 (migration)
- **Issue:** allauth tried to access non-existent username field
- **Fix:** Added ACCOUNT_USER_MODEL_USERNAME_FIELD = None to settings
- **Files modified:** backend/config/settings/base.py
- **Verification:** Migrations run successfully
- **Committed in:** 6642249 (Task 3 commit)

---

**Total deviations:** 5 auto-fixed (all Rule 3 - blocking issues)
**Impact on plan:** All fixes were necessary to make email-only auth work with dj-rest-auth/allauth stack. No scope creep.

## Issues Encountered
- dj-rest-auth deprecation warnings about ACCOUNT_EMAIL_REQUIRED and ACCOUNT_USERNAME_REQUIRED - these are from the library itself and don't affect functionality
- The allauth/dj-rest-auth stack has strong assumptions about username field presence - required multiple fixes to work around

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend foundation complete with all models and APIs
- Ready for frontend onboarding screens (01-02-PLAN)
- Ready for consent/disclaimer UI (01-03-PLAN)
- JWT tokens working for mobile app integration
- WebSocket middleware ready for real-time consent sync

---
*Phase: 01-foundation-safety*
*Completed: 2026-01-23*
