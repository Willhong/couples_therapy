"""Tests for user registration and authentication."""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class UserRegistrationTest(TestCase):
    """Test user registration via dj-rest-auth."""

    def setUp(self):
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


class UserLoginTest(TestCase):
    """Test user login and JWT token management."""

    def setUp(self):
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


class UserProfileTest(TestCase):
    """Test user profile and details."""

    def setUp(self):
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
