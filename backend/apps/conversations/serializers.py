"""Serializers for the unified conversation list."""

from rest_framework import serializers
from apps.chat.models import Conversation, Message


class UnifiedConversationSerializer(serializers.ModelSerializer):
    """Serializer for the unified conversation list.

    Merges text chats and audio recordings into a single
    chronological list with type-aware metadata.
    """

    type = serializers.CharField(source='conversation_type')
    type_display = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    recording_id = serializers.SerializerMethodField()
    post_action = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id',
            'type',
            'type_display',
            'title',
            'summary',
            'emotion_indicator',
            'created_at',
            'updated_at',
            'last_message_preview',
            'message_count',
            'recording_id',
            'post_action',
        ]
        read_only_fields = fields

    def get_type_display(self, obj: Conversation) -> str:
        """Return Korean display label for conversation type."""
        labels = {
            Conversation.ConversationType.TEXT: '텍스트 대화',
            Conversation.ConversationType.NARRATION: '나레이션 녹음',
            Conversation.ConversationType.LIVE: '실시간 녹음',
        }
        return labels.get(obj.conversation_type, obj.get_conversation_type_display())

    def get_message_count(self, obj: Conversation) -> int:
        """Return message count for this conversation."""
        return obj.messages.count()

    def get_last_message_preview(self, obj: Conversation) -> str:
        """Return truncated content of the most recent message."""
        last_msg = obj.messages.order_by('-created_at').first()
        if not last_msg:
            return ''
        text = str(last_msg.content)
        return text[:100] + '...' if len(text) > 100 else text

    def get_recording_id(self, obj: Conversation) -> str | None:
        """Return the linked audio recording id, if any."""
        recording = obj.audio_recordings.first()
        return str(recording.id) if recording else None

    def get_post_action(self, obj: Conversation) -> str | None:
        """Return the post-action choice from the linked audio recording."""
        recording = obj.audio_recordings.first()
        return recording.post_action if recording else None
