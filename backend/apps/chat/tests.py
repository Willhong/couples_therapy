"""Tests for chat and conversation functionality."""

from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.chat.models import Conversation, Message
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
            'conversation_type': 'text'
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['conversation_type'], 'text')
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
            # The raw value should be encrypted (different from plaintext)
            self.assertNotEqual(row[0], 'This is sensitive content')


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

    @patch('apps.chat.views.run_reframing_pipeline')
    def test_reframe_endpoint(self, mock_reframing_pipeline):
        """Test reframe endpoint returns response (mock LLM)."""
        # Mock the async LLM pipeline
        async def mock_async_reframe(*args, **kwargs):
            return {
                'mode': 'reframing',
                'final_response': 'I notice I am experiencing frustration in my relationship.',
                'analysis': {'test': 'data'},
                'suggestions': ['Test suggestion'],
                'is_abuse_detected': False
            }

        mock_reframing_pipeline.return_value = mock_async_reframe()

        response = self.client.post('/api/v1/chat/reframe/', {
            'conversation_id': str(self.conversation.id),
            'message': 'I am feeling frustrated with my partner.'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('final_response', response.data)
        self.assertEqual(response.data['mode'], 'reframing')

    @patch('apps.chat.views.run_comfort_pipeline')
    def test_comfort_endpoint(self, mock_comfort_pipeline):
        """Test comfort endpoint returns supportive response (mock LLM)."""
        # Mock the async comfort pipeline
        async def mock_async_comfort(*args, **kwargs):
            return {
                'final_response': 'It is okay to feel frustrated. Your feelings are valid.',
                'is_abuse_detected': False
            }

        mock_comfort_pipeline.return_value = mock_async_comfort()

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
