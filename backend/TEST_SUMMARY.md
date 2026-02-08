# Django Backend Test Suite Summary

## Overview
Created comprehensive automated tests for the Django backend with **59 total tests** covering 6 major app areas.

## Test Results Summary
- **Total Tests**: 59
- **Passing**: 27 (45.8%)
- **Failing**: 32 (54.2%)
  - Failures: 14
  - Errors: 18

## Apps Tested

### 1. `apps/users/tests.py` - Authentication (12 tests)
Tests email-based authentication with JWT tokens.

**Passing Tests**:
- ✅ Login with correct credentials
- ✅ Token refresh
- ✅ Get user details (authenticated)
- ✅ Reject unauthenticated access
- ✅ Wrong password fails
- ✅ Nonexistent user fails

**Failing Tests**:
- ❌ Registration (needs CAPTCHA/reCAPTCHA validation)
- ❌ Registration without email
- ❌ Duplicate email registration
- ❌ Password mismatch

**Issues**: dj-rest-auth registration requires additional fields or validation

---

### 2. `apps/couples/tests.py` - Partner Linking (11 tests)
Tests invite code generation and couple management.

**Passing Tests**:
- ✅ Redeem expired code fails
- ✅ Redeem already-used code fails
- ✅ Get partner info

**Failing Tests**:
- ❌ Generate invite code - **URL mismatch**: should be `/api/v1/couples/invite/generate/` not `/invite/`
- ❌ Redeem invite code - missing error details
- ❌ Redeem own code fails - missing error details
- ❌ Disconnect couple - should use `/api/v1/couples/disconnect/` not `/{id}/disconnect/`
- ❌ Get couple status - response format is `{'couple': {...}}` not a list
- ❌ Multiple active couples prevention - needs 404 check

**Fix Required**: Update URLs to match actual ViewSet routes

---

### 3. `apps/chat/tests.py` - Conversations & Messages (11 tests)
Tests chat, reframing, and sharing functionality.

**Passing Tests**:
- ✅ Get conversation detail
- ✅ Send message
- ✅ Share reframing with partner

**Failing Tests**:
- ❌ Create conversation - needs serializer validation
- ❌ List conversations - pagination format (`results` key)
- ❌ List messages - pagination format
- ❌ Message encryption - SQL query syntax
- ❌ Reframe endpoint - mock path incorrect
- ❌ Comfort endpoint - mock path incorrect
- ❌ Save reframing - needs `conversation_id`, `content`, and `reframing_data` fields
- ❌ List received reframings - pagination format

**Fix Required**: Mock LLM services correctly, fix field names

---

### 4. `apps/cooldown/tests.py` - Cool-down Timer (9 tests)
Tests conflict de-escalation timer.

**Status**: ✅ **ALL 9 TESTS PASSING**

This is the best-tested module with 100% pass rate!

---

### 5. `apps/safety/tests.py` - Safety Assessment (11 tests)
Tests abuse screening and risk evaluation.

**Passing Tests**:
- ✅ Get safety status
- ✅ Get safety status when not completed

**Failing Tests**:
- ❌ All assessment submission tests - **Field mismatch**: API expects `power_balance` (1-5), `fear` (yes/no), `control` (yes/no), `verbal_abuse` (yes/no), `physical_safety` (yes/no)
- ❌ Get crisis resources - response uses `hotlines` not `resources` key

**Fix Required**: Update test data to match actual API fields

---

### 6. `apps/prompts/tests.py` - Daily Prompts (15 tests)
Tests daily conversation prompts for couples.

**Passing Tests**:
- ✅ Prompt without couple fails

**Failing Tests**:
- ❌ Get today's prompt - TypeError in views (DurationField bug)
- ❌ Submit response - needs today's prompt first
- ❌ Reveal responses - depends on prompt assignment
- ❌ Prompt history - returns list not `{'history': [...]}`
- ❌ Topic library - returns grouped dict `{category: [prompts]}` not `{'prompts': [...]}`
- ❌ Filter by category - missing `prompts` key

**Fix Required**: Fix DurationField bug in `views.py:53`, update test assertions

---

## Critical Bugs Found

### 1. **DurationField TypeError** (prompts/views.py:53)
```python
# WRONG:
assigned_date__gte=date.today() - models.DurationField()(days=30)

# CORRECT:
from datetime import timedelta
assigned_date__gte=date.today() - timedelta(days=30)
```

### 2. **URL Route Mismatches**
- Invite code generation: `/api/v1/couples/invite/generate/` (not `/invite/`)
- Couple disconnect: `/api/v1/couples/disconnect/` (not `/{id}/disconnect/`)

### 3. **Response Format Inconsistencies**
- Couple list returns `{'couple': {...}}` not `[{...}]`
- Prompts library returns `{category: [prompts]}` not `{'prompts': [...]}`
- History returns `[...]` not `{'history': [...]}`
- Crisis resources returns `{hotlines: [...]}` not `{resources: [...]}`

---

## Recommendations

### Immediate Fixes (High Priority)
1. Fix `DurationField` bug in prompts views
2. Update couple test URLs to match ViewSet routes
3. Correct safety assessment field names
4. Add proper LLM service mocking for chat tests

### Test Improvements (Medium Priority)
1. Add serializer validation tests
2. Test pagination explicitly
3. Test WebSocket connections (not covered)
4. Add performance tests for LLM pipelines

### Missing Coverage (Low Priority)
- `apps/audio/` - No tests yet
- `apps/conversations/` - No tests yet
- `apps/patterns/` - No tests yet
- `apps/consents/` - No tests yet
- `apps/onboarding/` - No tests yet

---

## Running Tests

```bash
# Run all tests
cd backend
.venv\Scripts\python manage.py test --verbosity=2

# Run specific app
.venv\Scripts\python manage.py test apps.cooldown --verbosity=2

# Run with coverage
coverage run --source='apps' manage.py test
coverage report
```

---

## Next Steps
1. Fix critical bugs (DurationField, URL routes)
2. Update test assertions to match actual API responses
3. Add proper mocking for external services
4. Achieve 70%+ test pass rate
5. Add integration tests for full user flows
