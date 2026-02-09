"""Tests for daily prompts functionality."""

from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.prompts.models import DailyPrompt, DailyPromptAssignment, PromptResponse
from apps.couples.models import Couple

User = get_user_model()


class DailyPromptTest(TestCase):
    """Test daily prompt assignment and retrieval."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            password='TestPass123!'
        )
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            password='TestPass123!'
        )
        self.couple = Couple.objects.create(
            user1=self.user1,
            user2=self.user2,
            status=Couple.Status.ACTIVE,
            connected_at=timezone.now()
        )

        # Create some prompts
        self.prompt1 = DailyPrompt.objects.create(
            text_ko='오늘 하루 어땠나요?',
            category='daily',
            difficulty_level=1,
            is_active=True
        )
        self.prompt2 = DailyPrompt.objects.create(
            text_ko='당신의 꿈은 무엇인가요?',
            category='dreams',
            difficulty_level=2,
            is_active=True
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)

    def test_get_todays_prompt(self):
        """Test getting today's prompt auto-assigns for couple."""
        response = self.client.get('/api/v1/prompts/today/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('prompt', response.data)
        self.assertIn('text_ko', response.data['prompt'])

        # Verify assignment was created
        today = date.today()
        assignment = DailyPromptAssignment.objects.filter(
            couple=self.couple,
            assigned_date=today
        ).first()
        self.assertIsNotNone(assignment)

    def test_get_todays_prompt_returns_same_for_couple(self):
        """Test both partners get the same prompt for today."""
        # User1 gets prompt
        response1 = self.client.get('/api/v1/prompts/today/')
        prompt1_id = response1.data['prompt']['id']

        # User2 gets prompt
        self.client.force_authenticate(user=self.user2)
        response2 = self.client.get('/api/v1/prompts/today/')
        prompt2_id = response2.data['prompt']['id']

        # Should be the same prompt
        self.assertEqual(prompt1_id, prompt2_id)

    def test_submit_response(self):
        """Test submitting response to prompt."""
        # First get today's prompt
        self.client.get('/api/v1/prompts/today/')

        # Submit response
        response = self.client.post('/api/v1/prompts/respond/', {
            'response_text': '오늘은 정말 좋은 하루였어요!'
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify response was saved
        today = date.today()
        assignment = DailyPromptAssignment.objects.get(
            couple=self.couple,
            assigned_date=today
        )
        prompt_response = PromptResponse.objects.filter(
            assignment=assignment,
            user=self.user1
        ).first()
        self.assertIsNotNone(prompt_response)
        self.assertEqual(prompt_response.response_text, '오늘은 정말 좋은 하루였어요!')

    def test_submit_duplicate_response_rejected(self):
        """Test submitting response again is rejected."""
        # Get prompt and submit first response
        self.client.get('/api/v1/prompts/today/')
        self.client.post('/api/v1/prompts/respond/', {
            'response_text': '첫 번째 답변'
        })

        # Submit second response - should be rejected
        response = self.client.post('/api/v1/prompts/respond/', {
            'response_text': '두 번째 답변'
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Should still have only the first response
        today = date.today()
        assignment = DailyPromptAssignment.objects.get(
            couple=self.couple,
            assigned_date=today
        )
        responses = PromptResponse.objects.filter(
            assignment=assignment,
            user=self.user1
        )
        self.assertEqual(responses.count(), 1)
        self.assertEqual(responses.first().response_text, '첫 번째 답변')

    def test_reveal_requires_both_responses(self):
        """Test reveal endpoint requires both partners to respond."""
        # Get today's prompt
        self.client.get('/api/v1/prompts/today/')

        # Only user1 responds
        self.client.post('/api/v1/prompts/respond/', {
            'response_text': '나의 답변'
        })

        # Try to reveal
        response = self.client.get('/api/v1/prompts/reveal/')

        # Should not reveal yet (or indicate partner hasn't responded)
        if response.status_code == status.HTTP_200_OK:
            self.assertFalse(response.data.get('both_responded', True))

    def test_reveal_after_both_respond(self):
        """Test reveal shows both responses after both respond."""
        # Get today's prompt
        self.client.get('/api/v1/prompts/today/')

        # User1 responds
        self.client.post('/api/v1/prompts/respond/', {
            'response_text': '사용자1의 답변'
        })

        # User2 responds
        self.client.force_authenticate(user=self.user2)
        self.client.post('/api/v1/prompts/respond/', {
            'response_text': '사용자2의 답변'
        })

        # User1 reveals
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/v1/prompts/reveal/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('both_responded', False))
        self.assertIn('responses', response.data)

    def test_topic_library_lists_all(self):
        """Test topic library lists all active prompts."""
        response = self.client.get('/api/v1/prompts/library/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is grouped by category: {category: [prompts]}
        self.assertIsInstance(response.data, dict)

        # Should have at least our created categories
        self.assertIn('daily', response.data)
        self.assertIn('dreams', response.data)

    def test_topic_library_filter_by_category(self):
        """Test topic library filters by category."""
        response = self.client.get('/api/v1/prompts/library/?category=daily')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # When filtering by category, only that category should be in the response
        self.assertIn('daily', response.data)
        # All returned prompts should be 'daily' category
        for prompt in response.data['daily']:
            self.assertEqual(prompt['category'], 'daily')

    def test_prompt_history(self):
        """Test getting prompt history."""
        # Create past assignment with BOTH users responding
        yesterday = date.today() - timedelta(days=1)
        past_assignment = DailyPromptAssignment.objects.create(
            couple=self.couple,
            prompt=self.prompt1,
            assigned_date=yesterday
        )
        PromptResponse.objects.create(
            assignment=past_assignment,
            user=self.user1,
            response_text='과거의 답변'
        )
        # Add second user's response (history only shows when both responded)
        PromptResponse.objects.create(
            assignment=past_assignment,
            user=self.user2,
            response_text='파트너의 답변'
        )

        response = self.client.get('/api/v1/prompts/history/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is a list, not {'history': [...]}
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)

    def test_inactive_prompts_not_assigned(self):
        """Test inactive prompts are not assigned."""
        # Create inactive prompt
        inactive_prompt = DailyPrompt.objects.create(
            text_ko='비활성 프롬프트',
            category='daily',
            difficulty_level=1,
            is_active=False
        )

        # Get today's prompt multiple times
        for _ in range(5):
            self.client.get('/api/v1/prompts/today/')

            today = date.today()
            assignment = DailyPromptAssignment.objects.filter(
                couple=self.couple,
                assigned_date=today
            ).first()

            # Should not be the inactive prompt
            if assignment:
                self.assertNotEqual(assignment.prompt.id, inactive_prompt.id)

    def test_prompt_without_couple_fails(self):
        """Test prompts require a couple relationship."""
        # User without couple
        solo_user = User.objects.create_user(
            email='solo@example.com',
            password='TestPass123!'
        )
        self.client.force_authenticate(user=solo_user)

        response = self.client.get('/api/v1/prompts/today/')

        # Should fail or indicate no couple
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND])


# ============================================================================
# Edge Case Tests: HTTP 404/400 instead of 500
# ============================================================================

class PromptSoloUserEdgeCaseTest(TestCase):
    """Test prompt endpoints when user has no couple."""

    def setUp(self):
        self.solo_user = User.objects.create_user(
            email='prompt_solo@example.com', password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.solo_user)

    def test_today_prompt_without_couple(self):
        """GET today prompt without couple should return 404, not 500."""
        response = self.client.get('/api/v1/prompts/today/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for today prompt without couple")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_prompt_history_without_couple(self):
        """GET prompt history without couple should return 404, not 500."""
        response = self.client.get('/api/v1/prompts/history/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for prompt history without couple")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_respond_prompt_without_couple(self):
        """POST respond without couple should return 404, not 500."""
        response = self.client.post('/api/v1/prompts/respond/', {
            'response_text': 'My answer'
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for respond prompt without couple")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reveal_responses_without_couple(self):
        """GET reveal without couple should return 404, not 500."""
        response = self.client.get('/api/v1/prompts/reveal/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for reveal without couple")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PromptDisconnectedCoupleEdgeCaseTest(TestCase):
    """Test prompt endpoints after couple disconnection."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            email='pdisc1@example.com', password='TestPass123!'
        )
        self.user2 = User.objects.create_user(
            email='pdisc2@example.com', password='TestPass123!'
        )
        # Create disconnected couple
        self.couple = Couple.objects.create(
            user1=self.user1,
            user2=self.user2,
            status=Couple.Status.DISCONNECTED,
            connected_at=timezone.now(),
            disconnected_at=timezone.now()
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)

    def test_today_prompt_after_disconnect(self):
        """GET today prompt after disconnect should return 404, not 500."""
        response = self.client.get('/api/v1/prompts/today/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for today prompt after disconnect")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_prompt_history_after_disconnect(self):
        """GET prompt history after disconnect should return 404, not 500."""
        response = self.client.get('/api/v1/prompts/history/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for prompt history after disconnect")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PromptInvalidInputEdgeCaseTest(TestCase):
    """Test prompt endpoints with invalid input."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            email='pinv1@example.com', password='TestPass123!'
        )
        self.user2 = User.objects.create_user(
            email='pinv2@example.com', password='TestPass123!'
        )
        self.couple = Couple.objects.create(
            user1=self.user1,
            user2=self.user2,
            status=Couple.Status.ACTIVE,
            connected_at=timezone.now()
        )
        DailyPrompt.objects.create(
            text_ko='Test prompt',
            category='daily',
            difficulty_level=1,
            is_active=True
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)

    def test_respond_with_empty_body(self):
        """POST respond with empty body should return 400, not 500."""
        # First get today's prompt to create assignment
        self.client.get('/api/v1/prompts/today/')
        response = self.client.post('/api/v1/prompts/respond/', {}, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for empty respond body")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_respond_without_getting_prompt_first(self):
        """POST respond without getting today's prompt first should return 404, not 500."""
        # Don't call today's prompt first - so no assignment exists for today
        response = self.client.post('/api/v1/prompts/respond/', {
            'response_text': 'My answer without prompt'
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for respond without prompt assignment")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
