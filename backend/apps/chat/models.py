"""Chat models for conversations, messages, and sharing."""

import uuid
from django.db import models
from django.conf import settings
from fernet_fields.fields import EncryptedTextField


class Conversation(models.Model):
    """A conversation thread for a user."""

    class ConversationType(models.TextChoices):
        TEXT = 'text', 'Text Chat'
        NARRATION = 'narration', 'Narration Recording'
        LIVE = 'live', 'Live Recording'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.CASCADE,
        related_name='conversations',
        null=True, blank=True  # Solo users before partner connection
    )
    title = models.CharField(max_length=200, blank=True)  # Auto-generated from first message
    conversation_type = models.CharField(
        max_length=20,
        choices=ConversationType.choices,
        default=ConversationType.TEXT,
    )
    summary = models.TextField(blank=True, default='')
    emotion_indicator = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'conversations'
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation {self.id} - {self.user.email}"


class Message(models.Model):
    """Individual message in a conversation."""

    class Role(models.TextChoices):
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'
        SYSTEM = 'system', 'System'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    content = EncryptedTextField()  # Encrypted sensitive content

    # For reframing responses
    has_reframing = models.BooleanField(default=False)
    reframing_data = models.JSONField(null=True, blank=True)  # Structured reframing
    is_saved = models.BooleanField(default=False)  # Save to collection

    # Metadata
    token_count = models.IntegerField(null=True)  # For context management
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']

    def __str__(self):
        return f"Message {self.id} ({self.role})"

    @property
    def is_user(self) -> bool:
        return self.role == self.Role.USER


class ConversationSummary(models.Model):
    """Rolling summary of older messages for context management."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='summaries'
    )
    summary_text = EncryptedTextField()
    message_count = models.IntegerField()  # Number of messages summarized
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'conversation_summaries'
        ordering = ['-created_at']

    def __str__(self):
        return f"Summary for Conversation {self.conversation_id}"


class SharedReframing(models.Model):
    """Reframing shared with partner."""

    class PrivacyLevel(models.TextChoices):
        FULL = 'full', 'Full (original + reframing)'
        SUMMARY = 'summary', 'Summary only'
        NONE = 'none', 'Not shared'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='shares'
    )
    shared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shared_reframings'
    )
    shared_with = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_reframings'
    )
    privacy_level = models.CharField(
        max_length=20,
        choices=PrivacyLevel.choices,
        default=PrivacyLevel.FULL
    )
    partner_response = EncryptedTextField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    notified_at = models.DateTimeField(null=True, blank=True)
    shared_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'shared_reframings'

    def __str__(self):
        return f"Shared {self.message_id} from {self.shared_by.email} to {self.shared_with.email}"
