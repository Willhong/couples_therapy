"""Tests for pattern analysis edge cases."""

import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.chat.models import Conversation
from apps.couples.models import Couple

User = get_user_model()


# ============================================================================
# Edge Case Tests: HTTP 404/400 instead of 500
# ============================================================================

class PatternNonExistentUUIDTest(TestCase):
    """Test pattern endpoints with non-existent UUIDs return 404, not 500."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='pattern_edge@example.com', password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.fake_uuid = str(uuid.uuid4())

    def test_session_insights_nonexistent_conversation(self):
        """GET session insights for non-existent conversation should return 404."""
        response = self.client.get(f'/api/v1/patterns/session/{self.fake_uuid}/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for session insights with non-existent conversation")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_session_insights_malformed_uuid(self):
        """GET session insights with malformed UUID should return 404 (URL mismatch)."""
        response = self.client.get('/api/v1/patterns/session/not-a-uuid/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for session insights with malformed UUID")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PatternCrossUserAccessTest(TestCase):
    """Test cross-user access to pattern resources."""

    def setUp(self):
        self.user_a = User.objects.create_user(
            email='pat_a@example.com', password='TestPass123!'
        )
        self.user_b = User.objects.create_user(
            email='pat_b@example.com', password='TestPass123!'
        )
        # Create conversation owned by user B
        self.conv_b = Conversation.objects.create(
            user=self.user_b, title='UserB conversation'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user_a)

    def test_user_a_cannot_see_user_b_session_insights(self):
        """User A should get 404 for User B's session insights."""
        response = self.client.get(f'/api/v1/patterns/session/{self.conv_b.id}/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for cross-user session insights access")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PatternEmptyDataTest(TestCase):
    """Test pattern endpoints when no data exists."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='pat_empty@example.com', password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_pattern_list_empty(self):
        """GET pattern list when no patterns exist should return 200 with empty results."""
        response = self.client.get('/api/v1/patterns/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for empty pattern list")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    def test_insights_dashboard_empty(self):
        """GET insights dashboard when no data exists should return 200, not 500."""
        response = self.client.get('/api/v1/patterns/dashboard/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for empty insights dashboard")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_sessions'], 0)

    def test_weekly_summaries_empty(self):
        """GET weekly summaries when none exist should return 200, not 500."""
        response = self.client.get('/api/v1/patterns/weekly/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for empty weekly summaries")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    def test_latest_weekly_summary_empty(self):
        """GET latest weekly summary when none exist should return 404, not 500."""
        response = self.client.get('/api/v1/patterns/weekly/latest/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for non-existent latest weekly summary")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PatternInvalidQueryParamsTest(TestCase):
    """Test pattern endpoints with invalid query parameters."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='pat_inv@example.com', password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_pattern_list_invalid_page(self):
        """Invalid page param should fallback to page 1, not return 500."""
        response = self.client.get('/api/v1/patterns/?page=abc')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for invalid page param in patterns")
        self.assertIn(response.status_code, [200, 400])

    def test_pattern_list_invalid_page_size(self):
        """Invalid page_size param should fallback to default, not return 500."""
        response = self.client.get('/api/v1/patterns/?page_size=abc')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for invalid page_size param in patterns")
        self.assertIn(response.status_code, [200, 400])

    def test_pattern_list_invalid_pattern_type(self):
        """Invalid pattern_type filter should return 200 with empty results, not 500."""
        response = self.client.get('/api/v1/patterns/?pattern_type=invalid_type')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for invalid pattern_type filter")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    def test_pattern_list_invalid_date_from(self):
        """Invalid date_from should return 400, not 500."""
        response = self.client.get('/api/v1/patterns/?date_from=not-a-date')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for invalid date_from in patterns")
        self.assertEqual(response.status_code, 400)


class InsightsDashboardDaysParamTest(TestCase):
    """Test insights dashboard 'days' query parameter."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='days_param@example.com', password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.url = '/api/v1/patterns/dashboard/'

    def test_default_days_returns_200(self):
        """Dashboard with no days param should return 200 (default 28 days)."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_sessions', response.data)

    def test_days_7_returns_200(self):
        """Dashboard with ?days=7 should return 200."""
        response = self.client.get(f'{self.url}?days=7')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_sessions', response.data)

    def test_days_30_returns_200(self):
        """Dashboard with ?days=30 should return 200."""
        response = self.client.get(f'{self.url}?days=30')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_sessions', response.data)

    def test_days_capped_at_90(self):
        """Dashboard with ?days=999 should not error (capped at 90)."""
        response = self.client.get(f'{self.url}?days=999')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for days=999 (should be capped at 90)")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_days_invalid_string_does_not_500(self):
        """Dashboard with ?days=abc should not return 500."""
        response = self.client.get(f'{self.url}?days=abc')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for non-numeric days param")
        # Should either use default or return 400
        self.assertIn(response.status_code, [200, 400])

    def test_days_negative_does_not_500(self):
        """Dashboard with ?days=-5 should not return 500."""
        response = self.client.get(f'{self.url}?days=-5')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for negative days param")
        self.assertIn(response.status_code, [200, 400])

    def test_unauthenticated_returns_401(self):
        """Unauthenticated request should return 401."""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
