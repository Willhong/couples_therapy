# Phase 6: Infrastructure - Research

**Researched:** 2026-02-15
**Domain:** Database migration (SQLite -> PostgreSQL 16), Push notification delivery (Expo + backend)
**Confidence:** HIGH

## Summary

Phase 6 has three requirements: (1) migrate the SQLite database to PostgreSQL 16 while preserving Fernet-encrypted fields, (2) verify push notification backend infrastructure, and (3) configure the mobile app for push notification delivery via development builds.

The codebase is already well-prepared for this phase. The production settings (`config/settings/production.py`) already configure PostgreSQL via `DATABASE_URL`, Docker Compose already provisions PostgreSQL 16 + Redis 7, and the Dockerfile + entrypoint script handle migrations automatically. The push notification backend is already fully implemented -- `apps/core/notifications.py` has the Expo Push API service, `apps/users/models.py` has `expo_push_token` on the User model and `NotificationPreferences`, and the mobile app (`src/services/notifications.ts`) already registers tokens and handles deep linking. The primary work is **verification and configuration**, not new code.

The key risk is encrypted data corruption during migration (flagged as P3 in STATE.md). Research confirms this risk is manageable: djfernet 0.8.1 stores data as `BinaryField` which Django serializes to base64 in fixtures, and psycopg 3.3.2 returns `bytes` (not `memoryview`), eliminating the historic PostgreSQL BinaryField compatibility issue.

**Primary recommendation:** Use Django's `dumpdata`/`loaddata` for data migration (db is ~770KB, trivially small). For push notifications, focus on EAS Build configuration and FCM credential setup -- the code is already written.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| psycopg[binary] | 3.3.2 | PostgreSQL adapter for Django | Official Django-recommended psycopg3 driver |
| djfernet | 0.8.1 | Fernet symmetric encryption for model fields | Already in use for EncryptedTextField |
| PostgreSQL | 16-alpine | Production database (via Docker) | Already configured in docker-compose.yml |
| exponent-server-sdk | >=2.1 | Expo push notification sending | Already in requirements.txt and used in code |
| expo-notifications | ^0.32.16 | Mobile push notification handling | Already installed in mobile/package.json |
| expo-device | ^8.0.10 | Physical device detection | Already installed |
| expo-constants | ~18.0.13 | Project ID retrieval | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| redis | 7-alpine | Channel layers + Celery broker + Cache | Already in docker-compose.yml |
| channels-redis | >=4.2 | Redis channel layer backend | Already configured for production |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| dumpdata/loaddata | pgloader | pgloader is faster for large DBs but adds external dependency; DB is only 770KB |
| dumpdata/loaddata | Custom ORM migration script | More control over encrypted fields but unnecessary given djfernet handles serialization |
| Expo Push Service | Firebase direct / APNs direct | Expo wraps both FCM+APNs transparently; direct requires managing two codepaths |

**Installation:** No new packages needed. All dependencies are already in `requirements.txt` and `package.json`.

## Architecture Patterns

### Current Database Configuration Pattern
```
config/settings/
├── base.py          # DATABASE_URL defaults to sqlite:///db.sqlite3
├── development.py   # Inherits base (SQLite)
├── production.py    # DATABASE_URL required (PostgreSQL)
└── testing.py       # Test-specific settings
```

The `DATABASE_URL` environment variable pattern via `django-environ` makes switching seamless:
```python
# base.py - works for both SQLite (default) and PostgreSQL (env var)
DATABASES = {
    'default': env.db('DATABASE_URL', default=f'sqlite:///{BASE_DIR / "db.sqlite3"}')
}
```

### Fernet Encryption Architecture
```
Application Layer:
  EncryptedTextField (djfernet 0.8.1)
    ↓ encrypt via Fernet(HKDF-derived key)
Database Layer:
  BinaryField (stores opaque encrypted bytes)
    ↓ base64 encoded by Django serializer
Fixture Layer:
  JSON fixture (portable across SQLite/PostgreSQL)
```

Key insight: The FERNET_KEYS + HKDF derivation must be identical between source (SQLite) and target (PostgreSQL). The same `FERNET_KEYS` env var used with SQLite must be set for PostgreSQL.

### Encrypted Fields Inventory
| App | Model | Encrypted Fields |
|-----|-------|-----------------|
| chat | Message | `content` |
| chat | ConversationSummary | `summary_text` |
| chat | SharedReframing | `partner_response` |
| audio | AudioRecording | `full_text` |
| audio | TranscriptSegment | `text` |
| consents | RecordingConsent | `requester_ip`, `responder_ip` |
| consents | DisclaimerConsent | `ip_address` |
| patterns | InsightSummary | `ai_summary` |
| patterns | WeeklySummary | `trend_text` |
| intelligence | InsightReport | `pattern_analysis`, `emotion_analysis`, `balance_analysis`, `resolution_suggestions`, `report_summary` |

**Total: 6 apps, 10 models, 14 encrypted fields.**

### Push Notification Architecture (Already Built)
```
Mobile (expo-notifications)
  → registerForPushNotifications()
  → POST /api/v1/users/push-token/ {push_token: "ExponentPushToken[...]"}
  → Backend stores on User.expo_push_token

Backend (exponent-server-sdk)
  → send_push_notification(push_token, notification_type, data)
  → PushClient().publish(PushMessage(...))
  → Handles DeviceNotRegisteredError (clears invalid tokens)

Celery Tasks (async delivery):
  → send_push_notification_task(user_id, notification_type)
  → send_partner_notification_task(user_id, notification_type)
```

7 notification types are already defined in `NOTIFICATION_MESSAGES`:
- consent_request, daily_prompt, cooldown_complete, shared_reframing
- weekly_insight, partner_connected, partner_disconnected

### Pattern: EAS Build for Push Notifications
```
app.json configuration needed:
  ├── expo.plugins: ["expo-notifications"]
  ├── expo.android.package: "com.couplesai.app"  (already set in build.gradle)
  ├── expo.android.googleServicesFile: "./google-services.json"
  ├── expo.extra.eas.projectId: "<from EAS>"
  └── expo.ios (if/when iOS is needed)

EAS credential setup:
  ├── eas credentials --platform android  (FCM V1 service account)
  └── eas build --platform android --profile development
```

### Anti-Patterns to Avoid
- **Direct SQL data copy:** Never use raw SQL to copy data between SQLite and PostgreSQL. Encrypted BinaryField values may have different binary representations. Always use Django ORM (dumpdata/loaddata).
- **Changing FERNET_KEYS during migration:** The same keys must be used on both databases. Changing keys before migration will make existing data unreadable.
- **Testing push notifications on emulators:** Push tokens cannot be obtained on emulators/simulators. Always test on physical devices.
- **Sending push notifications synchronously:** Always use Celery tasks (`send_push_notification_task`) to avoid blocking request handling on network I/O to Expo's API.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite -> PostgreSQL data transfer | Custom row-by-row copy script | `dumpdata --natural-primary --natural-foreign` + `loaddata` | Django handles serialization of all field types including BinaryField |
| Push notification delivery | Direct HTTP to FCM/APNs | `exponent-server-sdk` via Expo Push Service | Expo handles both platforms, token management, chunking |
| Expo push token retrieval | Manual device token + server registration | `expo-notifications` `getExpoPushTokenAsync()` | Handles permissions, platform differences, projectId binding |
| Database connection pooling | Manual connection management | psycopg[binary] + Django CONN_MAX_AGE | Django handles connection lifecycle |

**Key insight:** Almost all infrastructure code is already written. The phase is about configuration, verification, and testing -- not new development.

## Common Pitfalls

### Pitfall 1: Forgetting ContentType/Permission Exclusions in dumpdata
**What goes wrong:** `loaddata` fails with IntegrityError because ContentType and Permission objects already exist from `migrate`.
**Why it happens:** Django auto-creates these during migration. Dumping and loading them creates duplicates.
**How to avoid:** Always use: `dumpdata --exclude contenttypes --exclude auth.permission --exclude admin.logentry --exclude sessions.session --natural-primary --natural-foreign`
**Warning signs:** IntegrityError on loaddata, "duplicate key" errors.

### Pitfall 2: FERNET_KEYS Mismatch Between Environments
**What goes wrong:** Encrypted fields return `InvalidToken` or garbled data after migration.
**Why it happens:** Different FERNET_KEYS between SQLite dev environment and PostgreSQL production. HKDF derives different encryption keys from different input keys.
**How to avoid:**
  1. Check current FERNET_KEYS in `.env` (default in base.py: `Tw6IKPg_AApN_RVtLWwmCGM20q3sUkURg7LwWvjClSA=`)
  2. Use the EXACT same key in the PostgreSQL environment
  3. Verify by reading one encrypted record after migration
**Warning signs:** `cryptography.fernet.InvalidToken` exception on any read of encrypted field.

### Pitfall 3: Missing google-services.json for Android Push
**What goes wrong:** `getExpoPushTokenAsync()` returns null or throws; push notifications never arrive on Android.
**Why it happens:** FCM requires google-services.json in the Android build. The file is currently missing from `mobile/android/app/`.
**How to avoid:**
  1. Create Firebase project for CouplesAI
  2. Download google-services.json
  3. Place in `mobile/android/app/google-services.json`
  4. Add to app.json plugins config
  5. Build with EAS
**Warning signs:** "Firebase not initialized" errors, null push tokens.

### Pitfall 4: Expo Go vs Development Build Confusion
**What goes wrong:** Push notifications work in code but never actually arrive during testing.
**Why it happens:** Since SDK 54, push notifications do NOT work in Expo Go. The current mobile code already handles this gracefully (returns null when projectId is missing), but actual testing requires a development build.
**How to avoid:** Always use `eas build --profile development` for testing push notifications.
**Warning signs:** `registerForPushNotifications()` returns null silently.

### Pitfall 5: SQLite-Specific SQL in Migrations
**What goes wrong:** `migrate` fails on PostgreSQL with syntax errors.
**Why it happens:** Some migrations might use SQLite-specific SQL. Unlikely here since all migrations use Django ORM, but worth checking.
**How to avoid:** Run `python manage.py migrate` against PostgreSQL and verify all migrations pass.
**Warning signs:** `ProgrammingError` during `migrate`.

### Pitfall 6: django_celery_beat Tables on Fresh PostgreSQL
**What goes wrong:** Celery Beat fails to start because periodic task tables don't exist.
**Why it happens:** `django_celery_beat` needs its migrations applied before the beat scheduler can write.
**How to avoid:** The entrypoint.sh already runs `migrate --noinput` before starting services. Verify Celery Beat service depends on backend (which runs migrations).
**Warning signs:** "relation django_celery_beat_periodictask does not exist" errors.

## Code Examples

### Data Migration Script (dumpdata/loaddata)
```bash
# Source: Django official docs + project-specific exclusions
# Step 1: Dump from SQLite
cd backend
DJANGO_SETTINGS_MODULE=config.settings.base \
  uv run python manage.py dumpdata \
    --exclude contenttypes \
    --exclude auth.permission \
    --exclude admin.logentry \
    --exclude sessions.session \
    --natural-primary \
    --natural-foreign \
    --indent 2 \
    -o data_dump.json

# Step 2: Verify the dump contains encrypted fields
# (they appear as base64-encoded strings in the JSON)
python -c "import json; d=json.load(open('data_dump.json')); print(len(d), 'objects')"

# Step 3: Start PostgreSQL
docker-compose up -d db redis

# Step 4: Run migrations on PostgreSQL
DATABASE_URL=postgres://couplesai:couplesai_password@localhost:5432/couplesai \
DJANGO_SETTINGS_MODULE=config.settings.production \
DJANGO_SECRET_KEY=temp-for-migration \
FERNET_KEYS=Tw6IKPg_AApN_RVtLWwmCGM20q3sUkURg7LwWvjClSA= \
  uv run python manage.py migrate

# Step 5: Load data into PostgreSQL
DATABASE_URL=postgres://couplesai:couplesai_password@localhost:5432/couplesai \
DJANGO_SETTINGS_MODULE=config.settings.production \
DJANGO_SECRET_KEY=temp-for-migration \
FERNET_KEYS=Tw6IKPg_AApN_RVtLWwmCGM20q3sUkURg7LwWvjClSA= \
  uv run python manage.py loaddata data_dump.json
```

### Verify Encrypted Data After Migration
```python
# Source: project-specific verification
# Run in Django shell connected to PostgreSQL
from apps.chat.models import Message
from apps.audio.models import TranscriptSegment

# If these don't raise InvalidToken, encryption is preserved
msgs = Message.objects.all()[:5]
for m in msgs:
    print(f"Message {m.id}: content length = {len(m.content) if m.content else 0}")

segs = TranscriptSegment.objects.all()[:5]
for s in segs:
    print(f"Segment {s.id}: text length = {len(s.text) if s.text else 0}")

print("All encrypted fields decrypted successfully!")
```

### Push Notification End-to-End Test
```python
# Source: project code (apps/core/notifications.py)
from apps.core.notifications import send_push_notification

# Test with a real Expo push token (from device)
result = send_push_notification(
    push_token="ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    notification_type="daily_prompt",
    data={"type": "daily_prompt"}
)
print(f"Notification sent: {result}")
```

### app.json Configuration for Push Notifications
```json
{
  "expo": {
    "name": "CouplesAI",
    "slug": "couples-ai",
    "version": "1.0.0",
    "newArchEnabled": true,
    "plugins": [
      "expo-notifications"
    ],
    "android": {
      "package": "com.couplesai.app",
      "googleServicesFile": "./google-services.json",
      "useNextNotificationsApi": true
    },
    "extra": {
      "eas": {
        "projectId": "<EAS_PROJECT_ID>"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| psycopg2 | psycopg 3 (psycopg[binary]) | 2023+ | Async support, returns bytes instead of memoryview for BinaryField |
| Expo Go for push testing | EAS Development Builds | SDK 54 (2025) | Push notifications require development builds |
| FCM Legacy API | FCM V1 API | 2024 | Google deprecated legacy API; Expo SDK 54 uses V1 |
| django-fernet-fields (orcasgit) | djfernet (yourlabs) | 2023+ | Active fork with Django 4/5 support |

**Deprecated/outdated:**
- FCM Legacy API: Deprecated by Google, must use FCM V1 with service account credentials
- Expo Go for push notifications: No longer supported since SDK 54
- psycopg2: Still works but psycopg3 is the recommended driver for new projects

## Open Questions

1. **Firebase Project Setup**
   - What we know: The AndroidManifest.xml already has Firebase messaging metadata. The build.gradle has the correct package name (`com.couplesai.app`).
   - What's unclear: Whether a Firebase project already exists for this app. No `google-services.json` was found in the project.
   - Recommendation: Check if Firebase project exists at https://console.firebase.google.com/. If not, create one and download `google-services.json`. This is a manual step that cannot be automated.

2. **EAS Project Configuration**
   - What we know: `eas.json` exists with build profiles (development, preview, production). The code checks for `Constants.expoConfig?.extra?.eas?.projectId` and gracefully returns null if missing.
   - What's unclear: Whether the project is linked to an EAS account. The `eas.json` submit section has empty Apple/Android credential fields.
   - Recommendation: Run `eas init` to link project, then configure credentials with `eas credentials`.

3. **Existing Data Volume**
   - What we know: `db.sqlite3` is 770KB -- very small. dumpdata/loaddata will work fine.
   - What's unclear: How much of this is actual user data vs. schema/migration state. Whether there's meaningful data worth preserving or if it's mostly test data.
   - Recommendation: Dump and inspect. If it's test data, a fresh PostgreSQL with just `migrate` may be simpler. If there's real data, use the full dumpdata/loaddata flow.

4. **iOS Push Notifications**
   - What we know: There's no `ios/` directory (gitignored, generated via prebuild). The app currently targets Android only for development.
   - What's unclear: Whether iOS push notification setup is needed in this phase.
   - Recommendation: Focus on Android push notifications first. iOS requires an Apple Developer Account ($99/year) and separate provisioning. This can be deferred to Phase 9 (App Store launch).

## Sources

### Primary (HIGH confidence)
- Project codebase: `backend/config/settings/base.py`, `backend/config/settings/production.py` -- database and encryption configuration
- Project codebase: `backend/apps/core/notifications.py` -- push notification service implementation
- Project codebase: `backend/apps/users/models.py` -- User.expo_push_token, NotificationPreferences
- Project codebase: `mobile/src/services/notifications.ts` -- mobile push notification registration
- Project codebase: `docker-compose.yml` -- PostgreSQL 16 + Redis 7 configuration
- Project codebase: `backend/.venv/Lib/site-packages/fernet_fields/fields.py` -- djfernet encryption internals
- Project codebase: `backend/MIGRATION_GUIDE.md` -- existing migration documentation
- [djfernet docs](https://djfernet.readthedocs.io/en/latest/) -- encryption, key management, database compatibility
- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) -- SDK 54+ requirements
- [expo-server-sdk-python](https://github.com/expo-community/expo-server-sdk-python) -- Python SDK for Expo Push API

### Secondary (MEDIUM confidence)
- [Django ticket #27813](https://code.djangoproject.com/ticket/27813) -- BinaryField type inconsistency between SQLite/PostgreSQL (resolved in psycopg3)
- [Django forum: SQLite to PostgreSQL migration](https://forum.djangoproject.com/t/migrating-from-sqlite-to-postgresql/29128) -- dumpdata/loaddata patterns
- [Expo SDK 54 push notification gist](https://gist.github.com/Xansiety/5e8d264c5391b7e287705efbca70b80f) -- FCM V1 setup steps

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, production settings already configured
- Architecture: HIGH -- push notification and database patterns are already implemented in the codebase
- Pitfalls: HIGH -- verified through Django docs, ticket tracker, and codebase inspection
- Data migration: HIGH -- db is small, djfernet + psycopg3 combination eliminates historic BinaryField issues

**What I might have missed:**
- Specific Firebase project configuration steps (requires access to Firebase console)
- Apple Developer Account setup for iOS push (deferred to Phase 9)
- Whether `token_blacklist` tables have any SQLite-specific behavior (unlikely but worth checking during migration)

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable infrastructure domain, 30-day validity)
