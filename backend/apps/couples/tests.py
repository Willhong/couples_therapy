"""Tests for couple and invite code functionality."""

from datetime import timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.couples.models import Couple, InviteCode

User = get_user_model()


class InviteCodeTest(TestCase):
    """Test invite code generation and redemption."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            password='TestPass123!'
        )
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()

    def test_generate_invite_code(self):
        """Test authenticated user can generate 6-char invite code."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/v1/couples/invite/generate/')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('code', response.data)
        self.assertEqual(len(response.data['code']), 6)
        self.assertTrue(InviteCode.objects.filter(creator=self.user1).exists())

    def test_redeem_invite_code(self):
        """Test partner can redeem code and couple is created."""
        self.client.force_authenticate(user=self.user1)
        # User1 generates code
        gen_response = self.client.post('/api/v1/couples/invite/generate/')
        invite_code = gen_response.data['code']

        # User2 redeems code
        self.client.force_authenticate(user=self.user2)
        redeem_response = self.client.post(
            '/api/v1/couples/invite/redeem/',
            {'code': invite_code}
        )

        self.assertEqual(redeem_response.status_code, status.HTTP_200_OK)

        # Verify couple was created
        couple = Couple.objects.filter(user1=self.user1, user2=self.user2).first()
        self.assertIsNotNone(couple)
        self.assertEqual(couple.status, Couple.Status.ACTIVE)

        # Verify code was marked as used
        invite = InviteCode.objects.get(code=invite_code)
        self.assertEqual(invite.used_by, self.user2)
        self.assertIsNotNone(invite.used_at)

    def test_redeem_own_code_fails(self):
        """Test user cannot redeem their own code."""
        self.client.force_authenticate(user=self.user1)
        # User1 generates code
        gen_response = self.client.post('/api/v1/couples/invite/generate/')
        invite_code = gen_response.data['code']

        # User1 tries to redeem their own code
        redeem_response = self.client.post(
            '/api/v1/couples/invite/redeem/',
            {'code': invite_code}
        )

        self.assertEqual(redeem_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_redeem_expired_code_fails(self):
        """Test expired code cannot be redeemed."""
        # Create expired invite code
        couple = Couple.objects.create(user1=self.user1, status=Couple.Status.PENDING)
        invite = InviteCode.objects.create(
            creator=self.user1,
            couple=couple,
            expires_at=timezone.now() - timedelta(hours=1)
        )

        self.client.force_authenticate(user=self.user2)
        response = self.client.post(
            '/api/v1/couples/invite/redeem/',
            {'code': invite.code}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_redeem_already_used_code_fails(self):
        """Test already used code cannot be redeemed again."""
        # Create used invite code
        couple = Couple.objects.create(
            user1=self.user1,
            user2=self.user2,
            status=Couple.Status.ACTIVE
        )
        invite = InviteCode.objects.create(
            creator=self.user1,
            couple=couple,
            used_by=self.user2,
            used_at=timezone.now()
        )

        # Create a third user
        user3 = User.objects.create_user(
            email='user3@example.com',
            password='TestPass123!'
        )

        self.client.force_authenticate(user=user3)
        response = self.client.post(
            '/api/v1/couples/invite/redeem/',
            {'code': invite.code}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CoupleManagementTest(TestCase):
    """Test couple relationship management."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            password='TestPass123!'
        )
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()

    def test_get_couple_status(self):
        """Test getting current couple status."""
        # Create active couple
        couple = Couple.objects.create(
            user1=self.user1,
            user2=self.user2,
            status=Couple.Status.ACTIVE,
            connected_at=timezone.now()
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/v1/couples/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response format is {'couple': {...}}
        self.assertIn('couple', response.data)
        self.assertIsNotNone(response.data['couple'])
        self.assertEqual(response.data['couple']['status'], 'active')

    def test_disconnect_couple(self):
        """Test couple can be disconnected."""
        couple = Couple.objects.create(
            user1=self.user1,
            user2=self.user2,
            status=Couple.Status.ACTIVE,
            connected_at=timezone.now()
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/v1/couples/disconnect/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify couple was disconnected
        couple.refresh_from_db()
        self.assertEqual(couple.status, Couple.Status.DISCONNECTED)
        self.assertIsNotNone(couple.disconnected_at)

    def test_user_cannot_have_multiple_active_couples(self):
        """Test user cannot create multiple active couples."""
        # Create active couple
        Couple.objects.create(
            user1=self.user1,
            user2=self.user2,
            status=Couple.Status.ACTIVE,
            connected_at=timezone.now()
        )

        # Try to create another invite code
        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/v1/couples/invite/generate/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_partner_info(self):
        """Test getting partner information."""
        couple = Couple.objects.create(
            user1=self.user1,
            user2=self.user2,
            status=Couple.Status.ACTIVE,
            connected_at=timezone.now()
        )

        self.client.force_authenticate(user=self.user1)
        partner = couple.get_partner(self.user1)

        self.assertEqual(partner, self.user2)
        self.assertEqual(partner.email, 'user2@example.com')
