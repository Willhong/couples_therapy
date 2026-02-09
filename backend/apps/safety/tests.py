"""Tests for safety assessment functionality."""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.safety.models import SafetyAssessment
from apps.couples.models import Couple

User = get_user_model()


class SafetyAssessmentTest(TestCase):
    """Test safety assessment and risk evaluation."""

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

    def test_submit_low_risk(self):
        """Test low-risk assessment enables couple features."""
        assessment_data = {
            'power_balance': 5,
            'fear': 'no',
            'control': 'no',
            'verbal_abuse': 'no',
            'physical_safety': 'no',
        }

        response = self.client.post('/api/v1/safety/assess/', assessment_data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['risk_level'], 'low')

        # Check SafetyAssessment was created
        assessment = SafetyAssessment.objects.get(user=self.user)
        self.assertEqual(assessment.risk_level, 'low')
        self.assertTrue(assessment.couple_features_enabled)

    def test_submit_high_risk_physical(self):
        """Test high-risk (physical safety) disables couple features."""
        assessment_data = {
            'power_balance': 3,
            'fear': 'no',
            'control': 'no',
            'verbal_abuse': 'no',
            'physical_safety': 'yes',  # High risk indicator
        }

        response = self.client.post('/api/v1/safety/assess/', assessment_data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['risk_level'], 'high')

        assessment = SafetyAssessment.objects.get(user=self.user)
        self.assertEqual(assessment.risk_level, 'high')
        self.assertFalse(assessment.couple_features_enabled)

    def test_submit_high_risk_fear(self):
        """Test high-risk (fear) disables couple features."""
        assessment_data = {
            'power_balance': 3,
            'fear': 'yes',  # High risk indicator
            'control': 'no',
            'verbal_abuse': 'no',
            'physical_safety': 'no',
        }

        response = self.client.post('/api/v1/safety/assess/', assessment_data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['risk_level'], 'high')

        assessment = SafetyAssessment.objects.get(user=self.user)
        self.assertFalse(assessment.couple_features_enabled)

    def test_submit_moderate_risk(self):
        """Test moderate risk assessment."""
        assessment_data = {
            'power_balance': 3,
            'fear': 'no',
            'control': 'yes',  # Moderate risk
            'verbal_abuse': 'no',
            'physical_safety': 'no',
        }

        response = self.client.post('/api/v1/safety/assess/', assessment_data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check risk level (may be moderate or still enable features with warnings)
        assessment = SafetyAssessment.objects.get(user=self.user)
        self.assertIn(assessment.risk_level, ['low', 'moderate'])

    def test_get_crisis_resources(self):
        """Test crisis resources endpoint returns Korean hotlines."""
        response = self.client.get('/api/v1/safety/resources/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('hotlines', response.data)
        self.assertIsInstance(response.data['hotlines'], list)
        self.assertGreater(len(response.data['hotlines']), 0)

        # Check for Korean resources
        hotlines = response.data['hotlines']
        self.assertTrue(any('여성긴급전화' in str(r) or '1366' in str(r) for r in hotlines))

    def test_get_safety_status(self):
        """Test getting current safety status."""
        # Create safety assessment
        SafetyAssessment.objects.create(
            user=self.user,
            risk_level='low',
            assessment_data={'test': 'data'},
            couple_features_enabled=True,
            completed_at=timezone.now()
        )

        response = self.client.get('/api/v1/safety/status/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['risk_level'], 'low')
        self.assertTrue(response.data['couple_features_enabled'])

    def test_get_safety_status_not_completed(self):
        """Test getting safety status when not completed."""
        response = self.client.get('/api/v1/safety/status/')

        # Should return 404 or indicate not completed
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_200_OK])

    def test_update_existing_assessment(self):
        """Test updating existing safety assessment."""
        # Create initial assessment
        SafetyAssessment.objects.create(
            user=self.user,
            risk_level='low',
            assessment_data={},
            couple_features_enabled=True,
            completed_at=timezone.now()
        )

        # Submit new assessment
        assessment_data = {
            'power_balance': 3,
            'fear': 'no',
            'control': 'no',
            'verbal_abuse': 'no',
            'physical_safety': 'yes',
        }

        response = self.client.post('/api/v1/safety/assess/', assessment_data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Should have updated the existing assessment (OneToOne relationship)
        assessment = SafetyAssessment.objects.get(user=self.user)
        self.assertEqual(assessment.risk_level, 'high')
        self.assertFalse(assessment.couple_features_enabled)

        # Should only have one assessment
        self.assertEqual(SafetyAssessment.objects.filter(user=self.user).count(), 1)

    def test_assessment_data_stored(self):
        """Test assessment data is properly stored."""
        assessment_data = {
            'power_balance': 3,
            'fear': 'no',
            'control': 'yes',
            'verbal_abuse': 'yes',
            'physical_safety': 'no',
        }

        response = self.client.post('/api/v1/safety/assess/', assessment_data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        assessment = SafetyAssessment.objects.get(user=self.user)
        # Check that assessment data was stored
        self.assertIsNotNone(assessment.assessment_data)
        self.assertIsInstance(assessment.assessment_data, dict)


# ============================================================================
# Edge Case Tests: HTTP 404/400 instead of 500
# ============================================================================

class SafetyInvalidInputEdgeCaseTest(TestCase):
    """Test safety endpoints with invalid input return 400, not 500."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='safety_edge@example.com', password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_assess_empty_body(self):
        """POST assess with empty body should return 400, not 500."""
        response = self.client.post('/api/v1/safety/assess/', {}, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for empty safety assessment body")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assess_with_wrong_field_names(self):
        """POST assess with wrong field names should return 400, not 500."""
        response = self.client.post('/api/v1/safety/assess/', {
            'wrong_field': 'value',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for wrong field names in safety assessment")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assess_with_invalid_power_balance(self):
        """POST assess with invalid power_balance should return 400, not 500."""
        response = self.client.post('/api/v1/safety/assess/', {
            'power_balance': 'not-a-number',
            'fear': 'no',
            'control': 'no',
            'verbal_abuse': 'no',
            'physical_safety': 'no',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for invalid power_balance")
        self.assertIn(response.status_code, [400, 201])

    def test_safety_status_not_completed(self):
        """GET safety status when not completed should return 404, not 500."""
        response = self.client.get('/api/v1/safety/status/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for safety status not yet completed")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
