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
