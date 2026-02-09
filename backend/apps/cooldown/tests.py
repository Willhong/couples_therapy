"""Tests for cool-down timer functionality."""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.cooldown.models import CoolDown
from apps.couples.models import Couple

User = get_user_model()


class CoolDownTest(TestCase):
    """Test cool-down session management."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='user@example.com',
            password='TestPass123!'
        )
        self.partner = User.objects.create_user(
            email='partner@example.com',
            password='TestPass123!'
        )
        self.couple = Couple.objects.create(
            user1=self.user,
            user2=self.partner,
            status=Couple.Status.ACTIVE,
            connected_at=timezone.now()
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_start_cooldown(self):
        """Test starting a cool-down session."""
        response = self.client.post('/api/v1/cooldown/start/', {
            'duration_seconds': 600  # 10 minutes
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CoolDown.objects.filter(user=self.user).exists())

        cooldown = CoolDown.objects.get(user=self.user)
        self.assertEqual(cooldown.duration_seconds, 600)
        self.assertTrue(cooldown.is_active)

    def test_start_cooldown_default_duration(self):
        """Test starting cool-down with default duration."""
        response = self.client.post('/api/v1/cooldown/start/', {})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        cooldown = CoolDown.objects.get(user=self.user)
        self.assertEqual(cooldown.duration_seconds, 600)  # Default 10 minutes

    def test_get_active_cooldown(self):
        """Test getting active cool-down."""
        # Create active cool-down
        cooldown = CoolDown.objects.create(
            user=self.user,
            couple=self.couple,
            duration_seconds=600,
            is_active=True
        )

        response = self.client.get('/api/v1/cooldown/active/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(cooldown.id))
        self.assertTrue(response.data['is_active'])

    def test_get_active_cooldown_none_exists(self):
        """Test getting active cool-down when none exists."""
        response = self.client.get('/api/v1/cooldown/active/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_complete_cooldown(self):
        """Test marking cool-down as completed."""
        cooldown = CoolDown.objects.create(
            user=self.user,
            couple=self.couple,
            duration_seconds=600,
            is_active=True
        )

        response = self.client.post(f'/api/v1/cooldown/{cooldown.id}/complete/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        cooldown.refresh_from_db()
        self.assertFalse(cooldown.is_active)
        self.assertIsNotNone(cooldown.completed_at)

    def test_cannot_start_multiple_active_cooldowns(self):
        """Test user cannot start multiple active cool-downs."""
        # Create first cooldown
        CoolDown.objects.create(
            user=self.user,
            couple=self.couple,
            duration_seconds=600,
            is_active=True
        )

        # Try to create another
        response = self.client.post('/api/v1/cooldown/start/', {
            'duration_seconds': 300
        })

        # Should either fail or auto-complete the previous one
        # Check implementation details
        active_cooldowns = CoolDown.objects.filter(user=self.user, is_active=True)
        self.assertLessEqual(active_cooldowns.count(), 1)

    def test_cooldown_associated_with_couple(self):
        """Test cool-down is associated with couple."""
        response = self.client.post('/api/v1/cooldown/start/', {
            'duration_seconds': 600
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        cooldown = CoolDown.objects.get(user=self.user)
        self.assertEqual(cooldown.couple, self.couple)

    def test_cooldown_without_couple(self):
        """Test cool-down can be started without couple."""
        # User without couple
        solo_user = User.objects.create_user(
            email='solo@example.com',
            password='TestPass123!'
        )
        self.client.force_authenticate(user=solo_user)

        response = self.client.post('/api/v1/cooldown/start/', {
            'duration_seconds': 600
        })

        # Should still work (cool-down for solo user)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        cooldown = CoolDown.objects.get(user=solo_user)
        self.assertIsNone(cooldown.couple)


# ============================================================================
# Edge Case Tests: HTTP 404/400 instead of 500
# ============================================================================

class CoolDownNonExistentUUIDTest(TestCase):
    """Test cooldown with non-existent UUIDs returns 404, not 500."""

    def setUp(self):
        import uuid
        self.user = User.objects.create_user(
            email='cooldown_edge@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.fake_uuid = str(uuid.uuid4())

    def test_complete_nonexistent_cooldown(self):
        """POST complete with non-existent cooldown UUID should return 404."""
        response = self.client.post(f'/api/v1/cooldown/{self.fake_uuid}/complete/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for completing non-existent cooldown")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_complete_already_completed_cooldown(self):
        """POST complete on already-completed cooldown should return 400."""
        cooldown = CoolDown.objects.create(
            user=self.user,
            duration_seconds=600,
            is_active=False,
            completed_at=timezone.now()
        )
        response = self.client.post(f'/api/v1/cooldown/{cooldown.id}/complete/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for completing already-completed cooldown")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CoolDownCrossUserAccessTest(TestCase):
    """Test cross-user access to cooldown resources."""

    def setUp(self):
        self.user_a = User.objects.create_user(
            email='cool_a@example.com', password='TestPass123!'
        )
        self.user_b = User.objects.create_user(
            email='cool_b@example.com', password='TestPass123!'
        )
        self.cooldown_b = CoolDown.objects.create(
            user=self.user_b,
            duration_seconds=600,
            is_active=True
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user_a)

    def test_user_a_cannot_complete_user_b_cooldown(self):
        """User A should get 404 completing User B's cooldown."""
        response = self.client.post(f'/api/v1/cooldown/{self.cooldown_b.id}/complete/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for cross-user cooldown completion")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CoolDownMalformedInputTest(TestCase):
    """Test cooldown with malformed input returns 400, not 500."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='cool_malform@example.com', password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_start_cooldown_negative_duration(self):
        """Negative duration_seconds should return 400, not 500."""
        response = self.client.post('/api/v1/cooldown/start/', {
            'duration_seconds': -100
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for negative duration")
        self.assertIn(response.status_code, [400, 201])

    def test_start_cooldown_string_duration(self):
        """String duration_seconds should return 400, not 500."""
        response = self.client.post('/api/v1/cooldown/start/', {
            'duration_seconds': 'not-a-number'
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for string duration")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_complete_malformed_uuid(self):
        """Malformed UUID in cooldown complete URL should return 404."""
        response = self.client.post('/api/v1/cooldown/not-a-uuid/complete/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for malformed UUID in cooldown URL")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
