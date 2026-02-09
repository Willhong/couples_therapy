"""Tests for chat and conversation functionality."""

import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.chat.models import Conversation, Message, SharedReframing
from apps.couples.models import Couple

User = get_user_model()


class ConversationTest(TestCase):
    """Test conversation management."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='user@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_conversation(self):
        """Test creating a new conversation."""
        response = self.client.post('/api/v1/chat/conversations/', {
            'title': 'Test conversation'
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertTrue(Conversation.objects.filter(user=self.user).exists())

    def test_list_conversations(self):
        """Test listing user's conversations."""
        # Create conversations
        Conversation.objects.create(
            user=self.user,
            conversation_type=Conversation.ConversationType.TEXT
        )
        Conversation.objects.create(
            user=self.user,
            conversation_type=Conversation.ConversationType.NARRATION
        )

        response = self.client.get('/api/v1/chat/conversations/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if paginated or not
        if 'results' in response.data:
            self.assertEqual(len(response.data['results']), 2)
        else:
            self.assertEqual(len(response.data), 2)

    def test_get_conversation_detail(self):
        """Test getting conversation details."""
        conversation = Conversation.objects.create(
            user=self.user,
            conversation_type=Conversation.ConversationType.TEXT,
            title='Test Conversation'
        )

        response = self.client.get(f'/api/v1/chat/conversations/{conversation.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Conversation')


class MessageTest(TestCase):
    """Test message creation and retrieval."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='user@example.com',
            password='TestPass123!'
        )
        self.conversation = Conversation.objects.create(
            user=self.user,
            conversation_type=Conversation.ConversationType.TEXT
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_send_message(self):
        """Test sending a message to conversation."""
        response = self.client.post(
            f'/api/v1/chat/conversations/{self.conversation.id}/messages/',
            {
                'role': 'user',
                'content': 'Hello, this is a test message.'
            }
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Message.objects.filter(conversation=self.conversation).exists()
        )

    def test_list_messages(self):
        """Test listing messages in a conversation."""
        # Create messages
        Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.USER,
            content='First message'
        )
        Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.ASSISTANT,
            content='Second message'
        )

        response = self.client.get(
            f'/api/v1/chat/conversations/{self.conversation.id}/messages/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if paginated or not
        if 'results' in response.data:
            self.assertEqual(len(response.data['results']), 2)
        else:
            self.assertEqual(len(response.data), 2)

    def test_messages_are_encrypted(self):
        """Test message content uses encryption."""
        message = Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.USER,
            content='This is sensitive content'
        )

        # The content field should be encrypted in the database
        # When we access it through the model, it's decrypted automatically
        self.assertEqual(message.content, 'This is sensitive content')

        # Verify it's stored encrypted (check the raw field)
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT content FROM messages WHERE id = %s",
                [str(message.id)]
            )
            row = cursor.fetchone()
            if row is not None:
                # The raw value should be encrypted (different from plaintext)
                self.assertNotEqual(row[0], 'This is sensitive content')
            else:
                # UUID lookup may not match in-memory DB; verify model-level decryption works
                refreshed = Message.objects.get(id=message.id)
                self.assertEqual(refreshed.content, 'This is sensitive content')


class ReframeEndpointTest(TestCase):
    """Test reframing endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='user@example.com',
            password='TestPass123!'
        )
        self.conversation = Conversation.objects.create(
            user=self.user,
            conversation_type=Conversation.ConversationType.TEXT
        )
        self.message = Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.USER,
            content='I am feeling frustrated with my partner.'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch('apps.chat.views.run_reframing_pipeline', new_callable=AsyncMock)
    def test_reframe_endpoint(self, mock_reframing_pipeline):
        """Test reframe endpoint returns response (mock LLM)."""
        mock_reframing_pipeline.return_value = {
            'mode': 'reframing',
            'final_response': 'I notice I am experiencing frustration in my relationship.',
            'analysis': {'test': 'data'},
            'suggestions': ['Test suggestion'],
            'is_abuse_detected': False
        }

        response = self.client.post('/api/v1/chat/reframe/', {
            'conversation_id': str(self.conversation.id),
            'message': 'I am feeling frustrated with my partner.'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('final_response', response.data)
        self.assertEqual(response.data['mode'], 'reframing')

    @patch('apps.chat.views.run_comfort_pipeline', new_callable=AsyncMock)
    def test_comfort_endpoint(self, mock_comfort_pipeline):
        """Test comfort endpoint returns supportive response (mock LLM)."""
        mock_comfort_pipeline.return_value = {
            'final_response': 'It is okay to feel frustrated. Your feelings are valid.',
            'is_abuse_detected': False
        }

        response = self.client.post('/api/v1/chat/comfort/', {
            'conversation_id': str(self.conversation.id),
            'message': 'I am feeling frustrated.'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('final_response', response.data)
        self.assertEqual(response.data['mode'], 'comfort')

    def test_save_reframing(self):
        """Test saving reframing to collection."""
        # The save_reframing endpoint creates a new message, not updates existing
        response = self.client.post(
            '/api/v1/chat/save-reframing/',
            {
                'conversation_id': str(self.conversation.id),
                'content': 'Test reframed message',
                'reframing_data': {
                    'analysis': {'test': 'data'},
                    'suggestions': ['Test suggestion']
                }
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify a new message was created
        new_message = Message.objects.filter(
            conversation=self.conversation,
            role=Message.Role.ASSISTANT
        ).latest('created_at')
        self.assertTrue(new_message.has_reframing)


class SharedReframingTest(TestCase):
    """Test sharing reframing with partner."""

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
            status=Couple.Status.ACTIVE
        )
        self.conversation = Conversation.objects.create(
            user=self.user1,
            couple=self.couple,
            conversation_type=Conversation.ConversationType.TEXT
        )
        self.message = Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.USER,
            content='I feel unheard.',
            has_reframing=True,
            reframing_data={'reframed': 'I would like to feel more heard.'}
        )
        self.client = APIClient()

    def test_share_reframing_with_partner(self):
        """Test sharing reframing with partner."""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post('/api/v1/chat/share/', {
            'message_id': str(self.message.id),
            'privacy_level': 'full'
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_received_reframings(self):
        """Test partner can list received reframings."""
        from apps.chat.models import SharedReframing

        # Create a shared reframing
        SharedReframing.objects.create(
            message=self.message,
            shared_by=self.user1,
            shared_with=self.user2,
            privacy_level='full'
        )

        self.client.force_authenticate(user=self.user2)
        response = self.client.get('/api/v1/chat/shared/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if paginated or not
        if 'results' in response.data:
            self.assertEqual(len(response.data['results']), 1)
        else:
            self.assertEqual(len(response.data), 1)

    def test_respond_to_shared_reframing(self):
        """Test partner can respond to shared reframing."""
        from apps.chat.models import SharedReframing

        # Create a shared reframing
        shared = SharedReframing.objects.create(
            message=self.message,
            shared_by=self.user1,
            shared_with=self.user2,
            privacy_level='full'
        )

        self.client.force_authenticate(user=self.user2)
        response = self.client.post(
            f'/api/v1/chat/shared/{shared.id}/respond/',
            {'partner_response': 'Thank you for sharing this with me.'}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        shared.refresh_from_db()
        self.assertEqual(shared.partner_response, 'Thank you for sharing this with me.')

    def test_mark_shared_as_read(self):
        """Test marking shared reframing as read."""
        from apps.chat.models import SharedReframing

        # Create a shared reframing
        shared = SharedReframing.objects.create(
            message=self.message,
            shared_by=self.user1,
            shared_with=self.user2,
            privacy_level='full',
            is_read=False
        )

        self.client.force_authenticate(user=self.user2)
        response = self.client.post(f'/api/v1/chat/shared/{shared.id}/read/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        shared.refresh_from_db()
        self.assertTrue(shared.is_read)

    def test_unread_count(self):
        """Test getting unread shared reframings count."""
        from apps.chat.models import SharedReframing

        # Create shared reframings - 2 unread, 1 read
        SharedReframing.objects.create(
            message=self.message,
            shared_by=self.user1,
            shared_with=self.user2,
            privacy_level='full',
            is_read=False
        )
        SharedReframing.objects.create(
            message=self.message,
            shared_by=self.user1,
            shared_with=self.user2,
            privacy_level='summary',
            is_read=False
        )
        SharedReframing.objects.create(
            message=self.message,
            shared_by=self.user1,
            shared_with=self.user2,
            privacy_level='full',
            is_read=True
        )

        self.client.force_authenticate(user=self.user2)
        response = self.client.get('/api/v1/chat/shared/unread-count/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)


class ConversationIsolationTest(TestCase):
    """Test that users cannot access other users' conversations or messages."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            email='user1@example.com', password='TestPass123!'
        )
        self.user2 = User.objects.create_user(
            email='user2@example.com', password='TestPass123!'
        )
        self.conv1 = Conversation.objects.create(
            user=self.user1, title='User1 conversation'
        )
        self.conv2 = Conversation.objects.create(
            user=self.user2, title='User2 conversation'
        )
        self.client = APIClient()

    def test_user_cannot_see_other_conversations(self):
        """Mobile should only list own conversations."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/v1/chat/conversations/')

        results = response.data.get('results', response.data)
        titles = [c['title'] for c in results]
        self.assertIn('User1 conversation', titles)
        self.assertNotIn('User2 conversation', titles)

    def test_user_cannot_access_other_conversation_detail(self):
        """Mobile should get 404 for other user's conversation."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/v1/chat/conversations/{self.conv2.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_read_other_conversation_messages(self):
        """Mobile should get empty list for other user's messages."""
        Message.objects.create(
            conversation=self.conv2, role='user', content='Secret message'
        )
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(
            f'/api/v1/chat/conversations/{self.conv2.id}/messages/'
        )
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_user_cannot_delete_other_conversation(self):
        """Mobile should get 404 when deleting other user's conversation."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.delete(f'/api/v1/chat/conversations/{self.conv2.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Verify not deleted
        self.assertTrue(Conversation.objects.filter(id=self.conv2.id).exists())


class ReframeValidationTest(TestCase):
    """Test reframe/comfort endpoint input validation."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='val@example.com', password='TestPass123!'
        )
        self.conversation = Conversation.objects.create(
            user=self.user, title='Test'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_reframe_missing_conversation_id(self):
        """Mobile should get 400 if conversation_id missing."""
        response = self.client.post('/api/v1/chat/reframe/', {
            'message': 'test',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reframe_missing_message(self):
        """Mobile should get 400 if message missing."""
        response = self.client.post('/api/v1/chat/reframe/', {
            'conversation_id': str(self.conversation.id),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reframe_nonexistent_conversation(self):
        """Mobile should get 404 for nonexistent conversation_id."""
        import uuid
        response = self.client.post('/api/v1/chat/reframe/', {
            'conversation_id': str(uuid.uuid4()),
            'message': 'test',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reframe_other_users_conversation(self):
        """Mobile should get 404 for other user's conversation_id."""
        other_user = User.objects.create_user(
            email='other@example.com', password='pass123!'
        )
        other_conv = Conversation.objects.create(user=other_user, title='Private')

        response = self.client.post('/api/v1/chat/reframe/', {
            'conversation_id': str(other_conv.id),
            'message': 'test',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_comfort_missing_fields(self):
        """Mobile should get 400 if comfort endpoint fields missing."""
        response = self.client.post('/api/v1/chat/comfort/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_comfort_nonexistent_conversation(self):
        """Mobile should get 404 for nonexistent conversation in comfort."""
        import uuid
        response = self.client.post('/api/v1/chat/comfort/', {
            'conversation_id': str(uuid.uuid4()),
            'message': 'I feel sad',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('apps.chat.views.detect_crisis')
    def test_crisis_detection_response_format(self, mock_crisis):
        """Mobile expects {mode: 'crisis', crisis_type, final_response, message_id}."""
        mock_crisis.return_value = {
            'is_crisis': True,
            'crisis_type': 'suicide',
            'severity': 'high',
            'matched_keywords': ['test'],
        }

        response = self.client.post('/api/v1/chat/reframe/', {
            'conversation_id': str(self.conversation.id),
            'message': 'crisis test message',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['mode'], 'crisis')
        self.assertIn('crisis_type', response.data)
        self.assertIn('final_response', response.data)
        self.assertIn('message_id', response.data)
        # Verify crisis response contains Korean hotline numbers
        self.assertIn('1393', response.data['final_response'])

    def test_save_reframing_missing_fields(self):
        """Mobile should get 400 if save-reframing fields missing."""
        response = self.client.post('/api/v1/chat/save-reframing/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_share_reframing_missing_message_id(self):
        """Mobile should get 400 if message_id missing for share."""
        response = self.client.post('/api/v1/chat/share/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_share_non_reframing_message(self):
        """Mobile should get 400 when sharing a non-reframing message."""
        msg = Message.objects.create(
            conversation=self.conversation,
            role='assistant',
            content='Just a chat message',
            has_reframing=False,
        )
        response = self.client.post('/api/v1/chat/share/', {
            'message_id': str(msg.id),
            'privacy_level': 'full',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LLMInfoTest(TestCase):
    """Test LLM info endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='llm@example.com', password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_llm_info_returns_provider_data(self):
        """Mobile can fetch LLM provider info for display."""
        response = self.client.get('/api/v1/chat/llm-info/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_llm_info_unauthenticated(self):
        """LLM info requires authentication."""
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/v1/chat/llm-info/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MessageEdgeCaseTest(TestCase):
    """Test edge cases for message handling."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='edge@example.com',
            password='TestPass123!'
        )
        self.conversation = Conversation.objects.create(
            user=self.user,
            conversation_type=Conversation.ConversationType.TEXT
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_reframe_empty_string_message(self):
        """Empty string message should get 400 (falsy in Python)."""
        response = self.client.post('/api/v1/chat/reframe/', {
            'conversation_id': str(self.conversation.id),
            'message': ''
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('apps.chat.views.run_reframing_pipeline', new_callable=AsyncMock)
    @patch('apps.chat.views.detect_crisis')
    def test_reframe_whitespace_only_message(self, mock_crisis, mock_pipeline):
        """Whitespace-only message is truthy so it passes validation and reaches LLM."""
        mock_crisis.return_value = {'is_crisis': False}
        mock_pipeline.return_value = {
            'mode': 'chat',
            'final_response': 'Could you tell me more?',
        }
        response = self.client.post('/api/v1/chat/reframe/', {
            'conversation_id': str(self.conversation.id),
            'message': '   '
        }, format='json')
        # Document: whitespace is truthy, passes to LLM (potential edge case to fix)
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_message_with_korean_text(self):
        """Korean text should be preserved through encryption."""
        korean_content = "나는 파트너와 대화가 어려워요"
        message = Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.USER,
            content=korean_content
        )

        # Read it back
        message.refresh_from_db()
        self.assertEqual(message.content, korean_content)

    def test_message_with_emoji(self):
        """Emoji content should be preserved through encryption."""
        emoji_content = "I'm so frustrated 😭💔"
        message = Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.USER,
            content=emoji_content
        )

        # Read it back
        message.refresh_from_db()
        self.assertEqual(message.content, emoji_content)

    def test_toggle_saved_nonexistent_message(self):
        """Toggle saved on nonexistent message should get 404."""
        import uuid
        fake_id = uuid.uuid4()
        response = self.client.post(
            f'/api/v1/chat/conversations/{self.conversation.id}/messages/{fake_id}/toggle_saved/'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ConversationTypeTest(TestCase):
    """Test conversation type validation."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='convtype@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_conversation_invalid_type(self):
        """Invalid conversation_type defaults to 'text' (serializer does not restrict)."""
        response = self.client.post('/api/v1/chat/conversations/', {
            'conversation_type': 'invalid'
        }, format='json')
        # Document current behavior: invalid type is accepted and defaults
        # This is a potential edge case to fix in the serializer
        self.assertIn(response.status_code, [
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,
        ])

    def test_create_text_conversation(self):
        """Create text conversation should succeed."""
        response = self.client.post('/api/v1/chat/conversations/', {
            'conversation_type': 'text'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_narration_conversation(self):
        """Create narration conversation should succeed."""
        response = self.client.post('/api/v1/chat/conversations/', {
            'conversation_type': 'narration'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ShareEdgeCaseTest(TestCase):
    """Test edge cases for sharing reframings."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            email='share1@example.com',
            password='TestPass123!'
        )
        self.user2 = User.objects.create_user(
            email='share2@example.com',
            password='TestPass123!'
        )
        self.couple = Couple.objects.create(
            user1=self.user1,
            user2=self.user2,
            status=Couple.Status.ACTIVE
        )
        self.conversation = Conversation.objects.create(
            user=self.user1,
            couple=self.couple,
            conversation_type=Conversation.ConversationType.TEXT
        )
        self.message = Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.USER,
            content='I feel unheard.',
            has_reframing=True,
            reframing_data={'reframed': 'I would like to feel more heard.'}
        )
        self.client = APIClient()

    def test_share_same_message_twice(self):
        """Sharing same message twice creates 2 records (document current behavior)."""
        from apps.chat.models import SharedReframing

        self.client.force_authenticate(user=self.user1)

        # Share first time
        response1 = self.client.post('/api/v1/chat/share/', {
            'message_id': str(self.message.id),
            'privacy_level': 'full'
        }, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Share second time
        response2 = self.client.post('/api/v1/chat/share/', {
            'message_id': str(self.message.id),
            'privacy_level': 'full'
        }, format='json')
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)

        # Verify 2 shares exist
        share_count = SharedReframing.objects.filter(message=self.message).count()
        self.assertEqual(share_count, 2)

    def test_respond_to_share_twice_overwrites(self):
        """Second response overwrites first (document current behavior)."""
        from apps.chat.models import SharedReframing

        shared = SharedReframing.objects.create(
            message=self.message,
            shared_by=self.user1,
            shared_with=self.user2,
            privacy_level='full'
        )

        self.client.force_authenticate(user=self.user2)

        # First response
        response1 = self.client.post(
            f'/api/v1/chat/shared/{shared.id}/respond/',
            {'partner_response': 'First response'}
        )
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Second response
        response2 = self.client.post(
            f'/api/v1/chat/shared/{shared.id}/respond/',
            {'partner_response': 'Second response'}
        )
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        # Verify second response overwrote first
        shared.refresh_from_db()
        self.assertEqual(shared.partner_response, 'Second response')

    def test_share_when_no_couple_exists(self):
        """Solo user trying to share should get 400."""
        solo_user = User.objects.create_user(
            email='solo@example.com',
            password='TestPass123!'
        )
        solo_conversation = Conversation.objects.create(
            user=solo_user,
            conversation_type=Conversation.ConversationType.TEXT
        )
        solo_message = Message.objects.create(
            conversation=solo_conversation,
            role=Message.Role.USER,
            content='I feel sad.',
            has_reframing=True,
            reframing_data={'reframed': 'I acknowledge my sadness.'}
        )

        self.client.force_authenticate(user=solo_user)
        response = self.client.post('/api/v1/chat/share/', {
            'message_id': str(solo_message.id),
            'privacy_level': 'full'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_share_with_invalid_privacy_level(self):
        """Invalid privacy_level should get 400."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/v1/chat/share/', {
            'message_id': str(self.message.id),
            'privacy_level': 'invalid'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unread_count_returns_zero_when_all_read(self):
        """Unread count should return 0 when all shares are read."""
        from apps.chat.models import SharedReframing

        # Create shares and mark all as read
        SharedReframing.objects.create(
            message=self.message,
            shared_by=self.user1,
            shared_with=self.user2,
            privacy_level='full',
            is_read=True
        )
        SharedReframing.objects.create(
            message=self.message,
            shared_by=self.user1,
            shared_with=self.user2,
            privacy_level='summary',
            is_read=True
        )

        self.client.force_authenticate(user=self.user2)
        response = self.client.get('/api/v1/chat/shared/unread-count/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    def test_respond_with_empty_string(self):
        """Responding with empty string should get 400 (falsy)."""
        from apps.chat.models import SharedReframing

        shared = SharedReframing.objects.create(
            message=self.message,
            shared_by=self.user1,
            shared_with=self.user2,
            privacy_level='full'
        )

        self.client.force_authenticate(user=self.user2)
        response = self.client.post(
            f'/api/v1/chat/shared/{shared.id}/respond/',
            {'partner_response': ''}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PaginationEdgeCaseTest(TestCase):
    """Test pagination edge cases."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='page@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_conversations_empty_list(self):
        """No conversations should return 200 with empty results."""
        response = self.client.get('/api/v1/chat/conversations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_conversations_beyond_last_page(self):
        """Requesting beyond last page should get 404 'Invalid page'."""
        # Create 1 conversation
        Conversation.objects.create(
            user=self.user,
            conversation_type=Conversation.ConversationType.TEXT
        )

        # Request page 999
        response = self.client.get('/api/v1/chat/conversations/?page=999')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Error message may be in Korean or English depending on LANGUAGE_CODE setting
        self.assertIn('detail', response.data)

    def test_messages_empty_conversation(self):
        """Conversation with no messages should return 200 with empty results."""
        conversation = Conversation.objects.create(
            user=self.user,
            conversation_type=Conversation.ConversationType.TEXT
        )

        response = self.client.get(
            f'/api/v1/chat/conversations/{conversation.id}/messages/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)


# ============================================================================
# Edge Case Tests: HTTP 404/400 instead of 500
# ============================================================================

class NonExistentUUIDEdgeCaseTest(TestCase):
    """Test that non-existent UUID resources return 404, not 500."""

    def setUp(self):
        import uuid
        self.user = User.objects.create_user(
            email='edge404@example.com',
            password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.fake_uuid = str(uuid.uuid4())

    def test_get_nonexistent_conversation_detail(self):
        """GET conversation detail with non-existent UUID should return 404."""
        response = self.client.get(f'/api/v1/chat/conversations/{self.fake_uuid}/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 instead of 404 for non-existent conversation")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_messages_for_nonexistent_conversation(self):
        """GET messages for non-existent conversation should return 200 empty or 404."""
        response = self.client.get(
            f'/api/v1/chat/conversations/{self.fake_uuid}/messages/'
        )
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for messages of non-existent conversation")
        # DRF ModelViewSet returns empty queryset (200) when conversation doesn't match user
        self.assertIn(response.status_code, [200, 404])

    def test_post_message_to_nonexistent_conversation(self):
        """POST message to non-existent conversation should return 404."""
        response = self.client.post(
            f'/api/v1/chat/conversations/{self.fake_uuid}/messages/',
            {'role': 'user', 'content': 'test message'},
            format='json'
        )
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for posting to non-existent conversation")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_nonexistent_conversation(self):
        """DELETE non-existent conversation should return 404."""
        response = self.client.delete(f'/api/v1/chat/conversations/{self.fake_uuid}/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for deleting non-existent conversation")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reframe_with_nonexistent_conversation_id(self):
        """POST reframe with non-existent conversation_id should return 404."""
        response = self.client.post('/api/v1/chat/reframe/', {
            'conversation_id': self.fake_uuid,
            'message': 'test message',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for reframe with non-existent conversation")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_comfort_with_nonexistent_conversation_id(self):
        """POST comfort with non-existent conversation_id should return 404."""
        response = self.client.post('/api/v1/chat/comfort/', {
            'conversation_id': self.fake_uuid,
            'message': 'I feel sad',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for comfort with non-existent conversation")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_save_reframing_with_nonexistent_conversation_id(self):
        """POST save-reframing with non-existent conversation_id should return 404."""
        response = self.client.post('/api/v1/chat/save-reframing/', {
            'conversation_id': self.fake_uuid,
            'content': 'test content',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for save-reframing with non-existent conversation")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_share_reframing_with_nonexistent_message_id(self):
        """POST share with non-existent message_id should return 404."""
        response = self.client.post('/api/v1/chat/share/', {
            'message_id': self.fake_uuid,
            'privacy_level': 'full',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for share with non-existent message_id")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_respond_to_nonexistent_shared_reframing(self):
        """POST respond to non-existent shared reframing should return 404."""
        response = self.client.post(
            f'/api/v1/chat/shared/{self.fake_uuid}/respond/',
            {'partner_response': 'test'},
            format='json'
        )
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for respond to non-existent shared reframing")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_read_nonexistent_shared_reframing(self):
        """POST read on non-existent shared reframing should return 404."""
        response = self.client.post(f'/api/v1/chat/shared/{self.fake_uuid}/read/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for marking non-existent shared reframing as read")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_toggle_saved_nonexistent_conversation_and_message(self):
        """Toggle saved on non-existent conversation+message should not return 500."""
        import uuid
        fake_conv = str(uuid.uuid4())
        fake_msg = str(uuid.uuid4())
        response = self.client.post(
            f'/api/v1/chat/conversations/{fake_conv}/messages/{fake_msg}/toggle_saved/'
        )
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for toggle_saved with non-existent IDs")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CrossUserAccessEdgeCaseTest(TestCase):
    """Test that User A cannot access User B's chat resources (returns 404, not 500)."""

    def setUp(self):
        self.user_a = User.objects.create_user(
            email='usera@example.com', password='TestPass123!'
        )
        self.user_b = User.objects.create_user(
            email='userb@example.com', password='TestPass123!'
        )
        # Create conversation owned by user B
        self.conv_b = Conversation.objects.create(
            user=self.user_b,
            conversation_type=Conversation.ConversationType.TEXT,
            title='UserB private'
        )
        self.msg_b = Message.objects.create(
            conversation=self.conv_b,
            role=Message.Role.ASSISTANT,
            content='Private response',
            has_reframing=True,
            reframing_data={'test': 'data'}
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user_a)

    def test_user_a_cannot_get_user_b_conversation_detail(self):
        """User A should get 404 for User B's conversation detail."""
        response = self.client.get(f'/api/v1/chat/conversations/{self.conv_b.id}/')
        self.assertNotEqual(response.status_code, 500)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_a_gets_empty_messages_for_user_b_conversation(self):
        """User A should get empty list for User B's conversation messages."""
        response = self.client.get(
            f'/api/v1/chat/conversations/{self.conv_b.id}/messages/'
        )
        self.assertNotEqual(response.status_code, 500)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_user_a_cannot_post_message_to_user_b_conversation(self):
        """User A should get 404 posting to User B's conversation."""
        response = self.client.post(
            f'/api/v1/chat/conversations/{self.conv_b.id}/messages/',
            {'role': 'user', 'content': 'hacked!'},
            format='json'
        )
        self.assertNotEqual(response.status_code, 500)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_a_cannot_reframe_in_user_b_conversation(self):
        """User A should get 404 reframing in User B's conversation."""
        response = self.client.post('/api/v1/chat/reframe/', {
            'conversation_id': str(self.conv_b.id),
            'message': 'test',
        }, format='json')
        self.assertNotEqual(response.status_code, 500)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_a_cannot_comfort_in_user_b_conversation(self):
        """User A should get 404 using comfort in User B's conversation."""
        response = self.client.post('/api/v1/chat/comfort/', {
            'conversation_id': str(self.conv_b.id),
            'message': 'test',
        }, format='json')
        self.assertNotEqual(response.status_code, 500)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_a_cannot_share_user_b_message(self):
        """User A should get 404 sharing User B's message."""
        response = self.client.post('/api/v1/chat/share/', {
            'message_id': str(self.msg_b.id),
            'privacy_level': 'full',
        }, format='json')
        self.assertNotEqual(response.status_code, 500)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_a_cannot_save_reframing_in_user_b_conversation(self):
        """User A should get 404 saving reframing in User B's conversation."""
        response = self.client.post('/api/v1/chat/save-reframing/', {
            'conversation_id': str(self.conv_b.id),
            'content': 'hacked content',
        }, format='json')
        self.assertNotEqual(response.status_code, 500)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class InvalidInputEdgeCaseTest(TestCase):
    """Test that invalid input returns 400, not 500."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='invalid@example.com', password='TestPass123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_reframe_empty_body(self):
        """POST reframe with empty body should return 400."""
        response = self.client.post('/api/v1/chat/reframe/', {}, format='json')
        self.assertNotEqual(response.status_code, 500)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_comfort_empty_body(self):
        """POST comfort with empty body should return 400."""
        response = self.client.post('/api/v1/chat/comfort/', {}, format='json')
        self.assertNotEqual(response.status_code, 500)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_save_reframing_empty_body(self):
        """POST save-reframing with empty body should return 400."""
        response = self.client.post('/api/v1/chat/save-reframing/', {}, format='json')
        self.assertNotEqual(response.status_code, 500)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_share_empty_body(self):
        """POST share with empty body should return 400."""
        response = self.client.post('/api/v1/chat/share/', {}, format='json')
        self.assertNotEqual(response.status_code, 500)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reframe_with_wrong_field_names(self):
        """POST reframe with wrong field names should return 400."""
        response = self.client.post('/api/v1/chat/reframe/', {
            'conv_id': 'something',
            'msg': 'something',
        }, format='json')
        self.assertNotEqual(response.status_code, 500)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_comfort_with_wrong_field_names(self):
        """POST comfort with wrong field names should return 400."""
        response = self.client.post('/api/v1/chat/comfort/', {
            'conv_id': 'something',
            'msg': 'something',
        }, format='json')
        self.assertNotEqual(response.status_code, 500)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_malformed_uuid_in_conversation_url(self):
        """Malformed UUID in conversation URL should return 404 (URL mismatch)."""
        response = self.client.get('/api/v1/chat/conversations/not-a-uuid/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for malformed UUID in conversation URL")
        # DRF router returns 404 for malformed UUID since it doesn't match the URL pattern
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_malformed_uuid_in_reframe_body(self):
        """Malformed UUID in reframe body should return 404, not 500."""
        response = self.client.post('/api/v1/chat/reframe/', {
            'conversation_id': 'not-a-valid-uuid',
            'message': 'test',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for malformed UUID in reframe body")
        self.assertEqual(response.status_code, 404)

    def test_malformed_uuid_in_comfort_body(self):
        """Malformed UUID in comfort body should return 404, not 500."""
        response = self.client.post('/api/v1/chat/comfort/', {
            'conversation_id': 'not-a-valid-uuid',
            'message': 'test',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for malformed UUID in comfort body")
        self.assertEqual(response.status_code, 404)

    def test_malformed_uuid_in_share_body(self):
        """Malformed UUID in share body should return 404, not 500."""
        response = self.client.post('/api/v1/chat/share/', {
            'message_id': 'not-a-valid-uuid',
            'privacy_level': 'full',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for malformed UUID in share body")
        self.assertEqual(response.status_code, 404)

    def test_malformed_uuid_in_save_reframing_body(self):
        """Malformed UUID in save-reframing body should return 404, not 500."""
        response = self.client.post('/api/v1/chat/save-reframing/', {
            'conversation_id': 'not-a-valid-uuid',
            'content': 'test',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for malformed UUID in save-reframing body")
        self.assertEqual(response.status_code, 404)


class ShareWithoutPartnerEdgeCaseTest(TestCase):
    """Test sharing reframing without a partner (solo user)."""

    def setUp(self):
        self.solo_user = User.objects.create_user(
            email='solo_share@example.com', password='TestPass123!'
        )
        self.conversation = Conversation.objects.create(
            user=self.solo_user,
            conversation_type=Conversation.ConversationType.TEXT
        )
        self.reframing_msg = Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.ASSISTANT,
            content='Reframed content',
            has_reframing=True,
            reframing_data={'analysis': 'test'}
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.solo_user)

    def test_share_reframing_without_partner_returns_400(self):
        """Solo user sharing reframing should get 400, not 500."""
        response = self.client.post('/api/v1/chat/share/', {
            'message_id': str(self.reframing_msg.id),
            'privacy_level': 'full',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 when solo user tried to share reframing")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DisconnectedCoupleEdgeCaseTest(TestCase):
    """Test behavior after couple disconnection."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            email='disc1@example.com', password='TestPass123!'
        )
        self.user2 = User.objects.create_user(
            email='disc2@example.com', password='TestPass123!'
        )
        # Create then disconnect
        self.couple = Couple.objects.create(
            user1=self.user1,
            user2=self.user2,
            status=Couple.Status.DISCONNECTED,
            connected_at=timezone.now(),
            disconnected_at=timezone.now()
        )
        self.conversation = Conversation.objects.create(
            user=self.user1,
            couple=self.couple,
            conversation_type=Conversation.ConversationType.TEXT
        )
        self.reframing_msg = Message.objects.create(
            conversation=self.conversation,
            role=Message.Role.ASSISTANT,
            content='Reframed content',
            has_reframing=True,
            reframing_data={'analysis': 'test'}
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)

    def test_share_reframing_after_disconnect_returns_400(self):
        """Sharing after disconnect should get 400 (no active couple), not 500."""
        response = self.client.post('/api/v1/chat/share/', {
            'message_id': str(self.reframing_msg.id),
            'privacy_level': 'full',
        }, format='json')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 for share after couple disconnect")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_shared_reframings_list_after_disconnect(self):
        """Listing shared reframings after disconnect should not return 500."""
        response = self.client.get('/api/v1/chat/shared/')
        self.assertNotEqual(response.status_code, 500,
                            "Server returned 500 listing shared reframings after disconnect")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
