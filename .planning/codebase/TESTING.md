# Testing Patterns

**Analysis Date:** 2026-02-13

## Test Framework

**Backend:**
- Django's built-in TestCase framework
- Config: Django test runner (no pytest config detected)
- Assertion: Django TestCase methods (`self.assertEqual`, `self.assertTrue`)

**Mobile:**
- No test framework configured
- No test files found in `mobile/src/`
- No jest, vitest, or testing-library dependencies in `package.json`

**Run Commands:**
```bash
# Backend tests
python manage.py test                    # Run all tests
python manage.py test apps.audio         # Run specific app tests
python manage.py test apps.audio.tests.AudioRecordingEdgeCaseTest  # Run specific test class

# Mobile tests
# Not configured
```

## Test File Organization

**Backend location:**
- Co-located with apps: `backend/apps/{app_name}/tests.py`
- All tests in single `tests.py` file per app
- Apps detected with tests: `audio`, `chat`, `couples`, `users`, etc. (10 test files total)

**Backend naming:**
- Standard: `tests.py`
- No separate test directories or multiple test modules per app

**Structure:**
```
backend/
├── apps/
│   ├── audio/
│   │   ├── models.py
│   │   ├── views.py
│   │   └── tests.py          # All audio tests
│   ├── activities/
│   │   ├── models.py
│   │   ├── views.py
│   │   └── (no tests.py)     # Not all apps have tests
```

**Mobile:**
- No test structure exists
- No test files in feature directories
- No `__tests__` directories

## Test Structure

**Backend suite organization:**
```python
from django.test import TestCase
from rest_framework.test import APIClient

class AudioRecordingEdgeCaseTest(TestCase):
    """Test audio recording endpoint edge cases."""

    def setUp(self):
        """Create test users and authenticate client."""
        self.user = User.objects.create_user(
            email='audio@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_recording_status_nonexistent_uuid(self):
        """Non-existent recording UUID should return 404."""
        fake_id = uuid.uuid4()
        response = self.client.get(f'/api/v1/audio/{fake_id}/status/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
```

**Patterns:**
- Class-based test suites inheriting from `TestCase`
- `setUp()` method creates test fixtures (users, clients, models)
- Test method names: `test_` prefix with descriptive snake_case
- Docstrings describe expected behavior: `"""Non-existent recording UUID should return 404."""`
- Group related tests in classes: `AudioRecordingEdgeCaseTest`, `DeleteRecordingEdgeCaseTest`, `SegmentUpdateEdgeCaseTest`

## Mocking

**Framework:**
- No explicit mocking framework in samples
- Django's test client mocks HTTP layer: `APIClient()`
- Database mocking via Django's test database (automatic)

**Patterns:**
```python
# Mock authentication
self.client.force_authenticate(user=self.user)

# Mock unauthenticated state
self.client.force_authenticate(user=None)

# Create test data (not true mocks, but test fixtures)
recording = AudioRecording.objects.create(
    user=self.user,
    recording_type='narration',
    status=AudioRecording.Status.COMPLETED,
)
```

**What to Mock:**
- Authentication state: `force_authenticate()`
- External API calls (not shown in samples, but likely use `unittest.mock` or `responses`)
- File uploads: `SimpleUploadedFile('test.m4a', b'fake audio content')`

**What NOT to Mock:**
- Database queries (use test database)
- Django ORM methods (test actual ORM behavior)
- Model validation (test real validation logic)

## Fixtures and Factories

**Backend test data:**
```python
# Fixture pattern in setUp()
def setUp(self):
    self.user = User.objects.create_user(
        email='audio@example.com',
        password='TestPass123!'
    )
    self.other_user = User.objects.create_user(
        email='audio_other@example.com',
        password='TestPass123!'
    )
    self.couple = Couple.objects.create(
        user1=self.user,
        user2=self.other_user,
        status=Couple.Status.ACTIVE,
    )
```

**Location:**
- Fixtures defined inline in `setUp()` method
- No separate fixture files or factory libraries (no factory_boy detected)
- Reusable test users created per test class

**Mobile:**
- No fixture pattern exists (no tests)

## Coverage

**Requirements:**
- No coverage target enforced
- No coverage config file detected (`.coveragerc`, `setup.cfg`)

**View Coverage:**
```bash
# Not configured - would typically be:
# coverage run manage.py test
# coverage report
# coverage html
```

**Current state:**
- Tests exist for critical paths: audio recording, edge cases, 404/500 scenarios
- Not all apps have tests (e.g., `activities` has no `tests.py`)
- Focus on API endpoint error handling and security (403 vs 404 leakage)

## Test Types

**Backend unit tests:**
- Scope: Individual API endpoints
- Approach: Test request/response cycle with APIClient
- Example: `test_recording_status_nonexistent_uuid()` tests 404 handling

**Backend integration tests:**
- Scope: Multi-model interactions (user + couple + recording)
- Approach: Test full workflows with multiple database operations
- Example: `test_delete_partners_recording_in_couple()` tests permissions across models

**Backend edge case tests:**
- Scope: Error scenarios (404, 403, 400, 500)
- Approach: Test malformed input, missing resources, unauthorized access
- Example: `AudioMalformedInputEdgeCaseTest` class tests invalid UUIDs

**Mobile E2E tests:**
- Not configured

## Common Patterns

**Backend async testing:**
- Not shown in samples (Django async views not detected)
- Would use Django's async test case: `django.test.TransactionTestCase`

**Backend error testing:**
```python
def test_transcript_nonexistent_uuid(self):
    """Non-existent recording UUID for transcript should return 404."""
    fake_id = uuid.uuid4()
    response = self.client.get(f'/api/v1/audio/{fake_id}/transcript/')
    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

def test_post_action_invalid_action(self):
    """Invalid action value should return 400, not 500."""
    response = self.client.post(
        f'/api/v1/audio/{recording.id}/action/',
        {'action': 'invalid_action'},
        format='json'
    )
    self.assertNotEqual(response.status_code, 500,
                        "Server returned 500 for invalid post-action value")
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

**Testing authentication:**
```python
def test_delete_unauthenticated(self):
    """Unauthenticated delete should return 401."""
    self.client.force_authenticate(user=None)
    response = self.client.delete(f'/api/v1/audio/{recording.id}/')
    self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

**Testing permissions:**
```python
def test_delete_other_users_recording_no_couple(self):
    """Deleting other user's recording (no couple) should return 403."""
    recording = AudioRecording.objects.create(user=self.other_user, ...)
    response = self.client.delete(f'/api/v1/audio/{recording.id}/')
    self.assertIn(response.status_code, [
        status.HTTP_403_FORBIDDEN,
        status.HTTP_404_NOT_FOUND,
    ])
```

**Testing malformed input:**
```python
def test_recording_status_malformed_uuid(self):
    """Malformed UUID in recording status URL should return 404."""
    response = self.client.get('/api/v1/audio/not-a-uuid/status/')
    self.assertNotEqual(response.status_code, 500,
                        "Server returned 500 for malformed UUID")
    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
```

## Testing Gaps

**Backend untested areas:**
- Activity views in `apps/activities/views.py` (no tests.py)
- Service layer logic in `services/` directories
- WebSocket consumers (channels code)
- Celery async tasks
- LangChain/LangGraph workflow logic

**Mobile untested areas:**
- All mobile code (zero tests)
- React components
- Custom hooks
- API integration layer
- Recording/audio functionality
- WebSocket real-time features

**Critical missing tests:**
- End-to-end workflows (full user journeys)
- Performance/load testing
- Security testing beyond basic 403/404 checks
- Mobile UI/component testing
- Mobile integration with backend APIs

## Test Documentation

**Docstring style:**
- Every test method has docstring
- Format: Single-line description of expected behavior
- Example: `"""Non-existent recording UUID should return 404."""`

**Test class docstrings:**
```python
class DeleteRecordingEdgeCaseTest(TestCase):
    """Test delete recording edge cases.

    BUG: delete_recording at line 280 fetches recording WITHOUT user filter:
        AudioRecording.objects.get(id=recording_id)
    Then checks ownership manually, leaking existence via 403 vs 404.
    """
```

**Assertions with messages:**
```python
self.assertNotEqual(response.status_code, 500,
                    "Server returned 500 for malformed UUID in audio status URL")
```

## Backend-specific Testing Patterns

**DRF test client:**
- Import: `from rest_framework.test import APIClient`
- Usage: `self.client = APIClient()`
- Authentication: `self.client.force_authenticate(user=self.user)`
- Requests: `self.client.get()`, `.post()`, `.patch()`, `.delete()`
- Format: `format='json'` or `format='multipart'` for files

**Status code assertions:**
- Use DRF constants: `status.HTTP_404_NOT_FOUND`, `status.HTTP_400_BAD_REQUEST`
- Test both positive and negative cases
- Verify error messages in response.data

**Database state assertions:**
```python
self.assertFalse(AudioRecording.objects.filter(id=recording.id).exists())
```

**Response data assertions:**
```python
self.assertIn('detail', response.data)
self.assertEqual(response.data['recording_id'], recording.id)
```

---

*Testing analysis: 2026-02-13*
