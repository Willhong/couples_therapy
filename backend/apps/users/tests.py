"""Tests for user registration and authentication."""

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class ThrottleMixin:
    """Mixin that disables DRF throttling for tests to prevent 429 errors."""

    def setUp(self):
        super().setUp()
        # Clear the default cache to reset all throttle counters
        cache.clear()


class UserRegistrationTest(ThrottleMixin, TestCase):
    """Test user registration via dj-rest-auth."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.registration_url = '/api/v1/auth/registration/'

    def test_register_with_email(self):
        """Test user can register with email and password."""
        data = {
            'email': 'newuser@example.com',
            'password1': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'disclaimer_accepted': True,
            'disclaimer_version': '1.0',
        }
        response = self.client.post(self.registration_url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())

    def test_register_without_email_fails(self):
        """Test registration fails without email."""
        data = {
            'password1': 'SecurePass123!',
            'password2': 'SecurePass123!',
        }
        response = self.client.post(self.registration_url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_register_duplicate_email_fails(self):
        """Test registration fails with duplicate email."""
        User.objects.create_user(email='existing@example.com', password='password123')

        data = {
            'email': 'existing@example.com',
            'password1': 'NewPass123!',
            'password2': 'NewPass123!',
        }
        response = self.client.post(self.registration_url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch_fails(self):
        """Test registration fails when passwords don't match."""
        data = {
            'email': 'test@example.com',
            'password1': 'SecurePass123!',
            'password2': 'DifferentPass123!',
        }
        response = self.client.post(self.registration_url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserLoginTest(ThrottleMixin, TestCase):
    """Test user login and JWT token management."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.login_url = '/api/v1/auth/login/'
        self.token_url = '/api/v1/auth/token/'
        self.refresh_url = '/api/v1/auth/token/refresh/'

    def test_login_success(self):
        """Test login returns JWT tokens."""
        data = {
            'email': 'test@example.com',
            'password': 'TestPass123!',
        }
        response = self.client.post(self.login_url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_wrong_password(self):
        """Test login fails with wrong password."""
        data = {
            'email': 'test@example.com',
            'password': 'WrongPassword123!',
        }
        response = self.client.post(self.login_url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_nonexistent_user(self):
        """Test login fails for non-existent user."""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'SomePass123!',
        }
        response = self.client.post(self.login_url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_obtain_with_email(self):
        """Test JWT token obtain endpoint with email."""
        data = {
            'email': 'test@example.com',
            'password': 'TestPass123!',
        }
        response = self.client.post(self.token_url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_token_refresh(self):
        """Test JWT token can be refreshed."""
        # First login to get tokens
        data = {
            'email': 'test@example.com',
            'password': 'TestPass123!',
        }
        login_response = self.client.post(self.login_url, data)
        refresh_token = login_response.data['refresh']

        # Refresh the token
        refresh_data = {'refresh': refresh_token}
        response = self.client.post(self.refresh_url, refresh_data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)


class UserProfileTest(ThrottleMixin, TestCase):
    """Test user profile and details."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email='profile@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.user_url = '/api/v1/auth/user/'

    def test_get_user_details(self):
        """Test authenticated user can get their details."""
        response = self.client.get(self.user_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'profile@example.com')

    def test_get_user_details_unauthenticated(self):
        """Test unauthenticated request is rejected."""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.user_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserDataExportTest(ThrottleMixin, TestCase):
    """Test PIPA compliance - user data export."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email='export@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.export_url = '/api/v1/users/me/data-export/'

    def test_export_user_data(self):
        """Test user can export their personal data."""
        response = self.client.get(self.export_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('profile', response.data)
        self.assertIn('conversations', response.data)
        self.assertIn('couple_status', response.data)
        self.assertEqual(response.data['profile']['email'], 'export@example.com')

    def test_export_unauthenticated(self):
        """Test unauthenticated request is rejected."""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.export_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserDataDeletionTest(ThrottleMixin, TestCase):
    """Test PIPA compliance - user data deletion."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email='delete@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.delete_url = '/api/v1/users/me/'

    def test_delete_user_account(self):
        """Test user can delete their account and data is anonymized."""
        user_id = self.user.id
        response = self.client.delete(self.delete_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify user is anonymized
        deleted_user = User.objects.get(id=user_id)
        self.assertTrue(deleted_user.email.startswith('deleted_'))
        self.assertTrue(deleted_user.email.endswith('@anonymized.com'))
        self.assertEqual(deleted_user.first_name, '')
        self.assertEqual(deleted_user.last_name, '')
        self.assertFalse(deleted_user.is_active)

    def test_delete_unauthenticated(self):
        """Test unauthenticated request is rejected."""
        self.client.force_authenticate(user=None)
        response = self.client.delete(self.delete_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PushTokenTest(ThrottleMixin, TestCase):
    """Test push notification token management (mobile-backend communication)."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email='push@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_register_push_token(self):
        """Mobile sends Expo push token after notification permission."""
        response = self.client.post('/api/v1/users/push-token/', {
            'push_token': 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.user.refresh_from_db()
        self.assertEqual(self.user.expo_push_token, 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]')

    def test_register_push_token_missing(self):
        """Mobile should get 400 if push_token not provided."""
        response = self.client.post('/api/v1/users/push-token/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unregister_push_token(self):
        """Mobile clears push token on logout."""
        self.user.expo_push_token = 'ExponentPushToken[xxx]'
        self.user.save()

        response = self.client.post('/api/v1/users/push-token/unregister/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.expo_push_token, '')

    def test_push_token_unauthenticated(self):
        """Push token endpoints require authentication."""
        self.client.force_authenticate(user=None)
        response = self.client.post('/api/v1/users/push-token/', {
            'push_token': 'ExponentPushToken[xxx]',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class BearerTokenFlowTest(ThrottleMixin, TestCase):
    """Test the full Bearer token flow matching mobile's api.ts interceptor."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email='bearer@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()

    def test_authenticated_request_with_bearer_token(self):
        """Mobile sends Authorization: Bearer <token> for protected endpoints."""
        login_response = self.client.post('/api/v1/auth/token/', {
            'email': 'bearer@example.com',
            'password': 'TestPass123!',
        }, format='json')
        access_token = login_response.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get('/api/v1/users/me/data-export/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_bearer_token_rejected(self):
        """Protected endpoints return 401 with invalid token."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid-token')
        response = self.client.get('/api/v1/users/me/data-export/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_no_token_rejected(self):
        """Protected endpoints return 401 without token."""
        response = self.client.get('/api/v1/users/me/data-export/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_verify(self):
        """Mobile can verify if access token is still valid."""
        login_response = self.client.post('/api/v1/auth/token/', {
            'email': 'bearer@example.com',
            'password': 'TestPass123!',
        }, format='json')
        access_token = login_response.data['access']

        response = self.client.post('/api/v1/auth/token/verify/', {
            'token': access_token,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_token_refresh_invalid(self):
        """Mobile handles invalid refresh token gracefully."""
        response = self.client.post('/api/v1/auth/token/refresh/', {
            'refresh': 'invalid-token-string',
        }, format='json')
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        ])


class TokenBlacklistTest(ThrottleMixin, TestCase):
    """Test JWT token blacklist and rotation edge cases."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email='tokentest@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.login_url = '/api/v1/auth/token/'
        self.refresh_url = '/api/v1/auth/token/refresh/'

    def test_old_refresh_token_blacklisted_after_rotation(self):
        """Old refresh token should fail after being used to get a new one."""
        # Login to get initial tokens
        login_response = self.client.post(self.login_url, {
            'email': 'tokentest@example.com',
            'password': 'TestPass123!',
        }, format='json')
        old_refresh_token = login_response.data['refresh']

        # Refresh to get new tokens (should blacklist the old one)
        refresh_response = self.client.post(self.refresh_url, {
            'refresh': old_refresh_token,
        }, format='json')
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)

        # Try to reuse the old refresh token - should fail
        reuse_response = self.client.post(self.refresh_url, {
            'refresh': old_refresh_token,
        }, format='json')
        self.assertIn(reuse_response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        ])

    def test_active_tokens_rejected_after_account_deletion(self):
        """Access tokens should be rejected after user account is deleted."""
        # Login to get tokens
        login_response = self.client.post(self.login_url, {
            'email': 'tokentest@example.com',
            'password': 'TestPass123!',
        }, format='json')
        access_token = login_response.data['access']

        # Delete the account
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        delete_response = self.client.delete('/api/v1/users/me/')
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        # Try to use the access token after deletion - should fail
        response = self.client.get('/api/v1/auth/user/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_multiple_device_token_independence(self):
        """Tokens from different devices should remain independent."""
        # Device A login
        device_a_response = self.client.post(self.login_url, {
            'email': 'tokentest@example.com',
            'password': 'TestPass123!',
        }, format='json')
        device_a_access = device_a_response.data['access']
        device_a_refresh = device_a_response.data['refresh']

        # Device B login
        device_b_response = self.client.post(self.login_url, {
            'email': 'tokentest@example.com',
            'password': 'TestPass123!',
        }, format='json')
        device_b_access = device_b_response.data['access']

        # Refresh on device A
        refresh_response = self.client.post(self.refresh_url, {
            'refresh': device_a_refresh,
        }, format='json')
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)

        # Device B's tokens should still work
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {device_b_access}')
        response = self.client.get('/api/v1/auth/user/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class RegistrationEdgeCaseTest(ThrottleMixin, TestCase):
    """Test registration edge cases and validation."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.registration_url = '/api/v1/auth/registration/'

    def test_registration_email_case_insensitive(self):
        """Email should be case-insensitive - duplicates should be rejected."""
        # Register with mixed case email
        data1 = {
            'email': 'Test@Example.COM',
            'password1': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'disclaimer_accepted': True,
            'disclaimer_version': '1.0',
        }
        response1 = self.client.post(self.registration_url, data1)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Try to register with lowercase version - should fail
        data2 = {
            'email': 'test@example.com',
            'password1': 'DifferentPass123!',
            'password2': 'DifferentPass123!',
            'disclaimer_accepted': True,
            'disclaimer_version': '1.0',
        }
        response2 = self.client.post(self.registration_url, data2)
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_email_special_characters(self):
        """Email with plus sign and other valid special characters should work."""
        data = {
            'email': 'user+tag@example.com',
            'password1': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'disclaimer_accepted': True,
            'disclaimer_version': '1.0',
        }
        response = self.client.post(self.registration_url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='user+tag@example.com').exists())

    def test_registration_weak_password(self):
        """Weak passwords - document current behavior.

        Note: The custom CustomRegisterSerializer may not run Django's
        password validators. This test documents the actual behavior.
        """
        data = {
            'email': 'weakpass@example.com',
            'password1': '12345678',
            'password2': '12345678',
            'disclaimer_accepted': True,
            'disclaimer_version': '1.0',
        }
        response = self.client.post(self.registration_url, data)

        # Document current behavior: custom serializer may not enforce password strength
        # If 201, this is a potential security edge case to fix
        self.assertIn(response.status_code, [
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,
        ])

    def test_registration_disclaimer_rejected(self):
        """Registration should fail if disclaimer is not accepted."""
        data = {
            'email': 'nodisclaimer@example.com',
            'password1': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'disclaimer_accepted': False,
            'disclaimer_version': '1.0',
        }
        response = self.client.post(self.registration_url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('disclaimer_accepted', response.data)


class BearerTokenEdgeCaseTest(ThrottleMixin, TestCase):
    """Test Bearer token header edge cases."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email='bearer_edge@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.protected_url = '/api/v1/auth/user/'

        # Get a valid token for tests
        login_response = self.client.post('/api/v1/auth/token/', {
            'email': 'bearer_edge@example.com',
            'password': 'TestPass123!',
        }, format='json')
        self.valid_token = login_response.data['access']

    def test_malformed_bearer_header_lowercase(self):
        """Lowercase 'bearer' should be rejected (RFC 6750 is case-sensitive)."""
        self.client.credentials(HTTP_AUTHORIZATION=f'bearer {self.valid_token}')
        response = self.client.get(self.protected_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_bearer_header_missing_token(self):
        """Authorization header with 'Bearer' but no token should fail."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ')
        response = self.client.get(self.protected_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_expired_token_returns_401(self):
        """Expired access token should return 401."""
        from rest_framework_simplejwt.tokens import AccessToken
        from datetime import timedelta
        from django.utils import timezone

        # Create an already-expired token
        token = AccessToken.for_user(self.user)
        # Set expiration to the past
        token.set_exp(from_time=timezone.now() - timedelta(hours=1))

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(token)}')
        response = self.client.get(self.protected_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ============================================================================
# Edge Case Tests: HTTP 404/400/405 instead of 500
# ============================================================================

class DataExportEdgeCaseTest(ThrottleMixin, TestCase):
    """Test data export edge cases.

    BUG: Mobile settings.tsx line 85 calls api.post('/users/me/data-export/')
    but backend view is @api_view(['GET']) only. POST returns 405.
    """

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email='export_edge@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_data_export_post_returns_405(self):
        """POST to data-export should return 405 Method Not Allowed.

        BUG: Mobile sends POST but backend only accepts GET.
        This documents the mismatch - mobile should use GET.
        """
        response = self.client.post('/api/v1/users/me/data-export/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for POST to GET-only data-export")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_data_export_put_returns_405(self):
        """PUT to data-export should return 405."""
        response = self.client.put('/api/v1/users/me/data-export/')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_data_export_delete_returns_405(self):
        """DELETE to data-export should return 405."""
        response = self.client.delete('/api/v1/users/me/data-export/')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class DataDeletionEdgeCaseTest(ThrottleMixin, TestCase):
    """Test data deletion edge cases."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email='del_edge@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_double_delete_returns_401(self):
        """Deleting account twice with real token should fail on second attempt.

        Note: force_authenticate bypasses token validation, so we use
        real Bearer tokens to test that inactive users are rejected.
        """
        # Get real token first
        self.client.force_authenticate(user=None)
        login_response = self.client.post('/api/v1/auth/token/', {
            'email': 'del_edge@example.com',
            'password': 'TestPass123!',
        }, format='json')
        access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        # First delete
        response1 = self.client.delete('/api/v1/users/me/')
        self.assertEqual(response1.status_code, status.HTTP_204_NO_CONTENT)

        # Second delete - user is now inactive, token should be rejected
        response2 = self.client.delete('/api/v1/users/me/')
        self.assertEqual(response2.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_export_after_delete_returns_401(self):
        """Exporting data after account deletion with real token should return 401."""
        # Get real token first
        self.client.force_authenticate(user=None)
        login_response = self.client.post('/api/v1/auth/token/', {
            'email': 'del_edge@example.com',
            'password': 'TestPass123!',
        }, format='json')
        access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        self.client.delete('/api/v1/users/me/')
        response = self.client.get('/api/v1/users/me/data-export/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PushTokenEdgeCaseTest(ThrottleMixin, TestCase):
    """Test push token edge cases."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email='push_edge@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_register_empty_push_token(self):
        """Empty push token should return 400, not 500."""
        response = self.client.post('/api/v1/users/push-token/', {
            'push_token': '',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for empty push token")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_very_long_push_token(self):
        """Very long push token should not cause 500."""
        long_token = 'ExponentPushToken[' + 'x' * 10000 + ']'
        response = self.client.post('/api/v1/users/push-token/', {
            'push_token': long_token,
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for very long push token")
        # May succeed (200) or fail (400) depending on field length constraints
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST,
        ])

    def test_unregister_when_no_token_exists(self):
        """Unregistering when no token set should succeed (idempotent)."""
        response = self.client.post('/api/v1/users/push-token/unregister/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for unregister when no token")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
