"""Serializers for chat API."""

from rest_framework import serializers
from .models import Conversation, Message, ConversationSummary, SharedReframing


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for individual messages."""

    class Meta:
        model = Message
        fields = [
            'id',
            'role',
            'content',
            'has_reframing',
            'reframing_data',
            'is_saved',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_role(self, value):
        """Ensure only 'user' role can be created via API."""
        if self.instance is None and value != Message.Role.USER:
            raise serializers.ValidationError('사용자 메시지만 생성할 수 있습니다.')
        return value


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for conversation list."""

    message_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id',
            'title',
            'is_active',
            'created_at',
            'updated_at',
            'message_count',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'message_count']

    def get_message_count(self, obj):
        """Return the count of messages in this conversation."""
        return obj.messages.count()


class ConversationDetailSerializer(ConversationSerializer):
    """Serializer for conversation detail with messages."""

    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ['messages']

    def to_representation(self, instance):
        """Paginate messages to latest 50."""
        data = super().to_representation(instance)
        # Get latest 50 messages, ordered by created_at
        messages = instance.messages.order_by('-created_at')[:50]
        # Reverse to show oldest first
        data['messages'] = MessageSerializer(reversed(list(messages)), many=True).data
        return data


class ConversationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new conversation."""

    class Meta:
        model = Conversation
        fields = ['id', 'title', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        """Create conversation for the authenticated user."""
        user = self.context['request'].user
        validated_data['user'] = user

        # Check if user has an active couple
        from apps.couples.models import Couple
        couple = Couple.objects.filter(
            (models.Q(user1=user) | models.Q(user2=user)),
            status=Couple.Status.ACTIVE
        ).first()
        if couple:
            validated_data['couple'] = couple

        return super().create(validated_data)


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new message."""

    class Meta:
        model = Message
        fields = ['id', 'content', 'role', 'created_at']
        read_only_fields = ['id', 'role', 'created_at']

    def create(self, validated_data):
        """Create message with role='user' enforced."""
        validated_data['role'] = Message.Role.USER
        validated_data['conversation'] = self.context['conversation']
        return super().create(validated_data)


class SharedReframingSerializer(serializers.ModelSerializer):
    """Serializer for shared reframings."""

    message = MessageSerializer(read_only=True)
    message_id = serializers.UUIDField(write_only=True)
    shared_by_email = serializers.EmailField(source='shared_by.email', read_only=True)

    class Meta:
        model = SharedReframing
        fields = [
            'id',
            'message',
            'message_id',
            'privacy_level',
            'shared_at',
            'partner_response',
            'shared_by_email',
            'is_read',
            'notified_at',
        ]
        read_only_fields = ['id', 'shared_at', 'message', 'shared_by_email', 'is_read', 'notified_at']

    def validate_message_id(self, value):
        """Validate message exists and has reframing data."""
        try:
            message = Message.objects.get(id=value)
        except Message.DoesNotExist:
            raise serializers.ValidationError('메시지를 찾을 수 없습니다.')

        if not message.has_reframing:
            raise serializers.ValidationError('리프레이밍이 없는 메시지는 공유할 수 없습니다.')

        # Verify user owns this message's conversation
        user = self.context['request'].user
        if message.conversation.user != user:
            raise serializers.ValidationError('이 메시지를 공유할 권한이 없습니다.')

        return value

    def create(self, validated_data):
        """Create shared reframing with partner validation."""
        user = self.context['request'].user
        message_id = validated_data.pop('message_id')
        message = Message.objects.get(id=message_id)

        # Get user's active couple
        from apps.couples.models import Couple
        couple = Couple.objects.filter(
            (models.Q(user1=user) | models.Q(user2=user)),
            status=Couple.Status.ACTIVE
        ).first()

        if not couple:
            raise serializers.ValidationError({'non_field_errors': ['파트너와 연결되어 있지 않습니다.']})

        partner = couple.get_partner(user)
        if not partner:
            raise serializers.ValidationError({'non_field_errors': ['파트너를 찾을 수 없습니다.']})

        validated_data['message'] = message
        validated_data['shared_by'] = user
        validated_data['shared_with'] = partner

        return super().create(validated_data)


# Fix: Import models for Q object
from django.db import models
