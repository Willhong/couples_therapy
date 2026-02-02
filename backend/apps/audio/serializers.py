"""Serializers for audio recording and transcription API."""

from django.conf import settings
from rest_framework import serializers

from .models import AudioRecording, TranscriptSegment, TranscriptEdit


class TranscriptSegmentSerializer(serializers.ModelSerializer):
    """Serializer for transcript segments."""

    class Meta:
        model = TranscriptSegment
        fields = [
            'id', 'speaker', 'speaker_label', 'text',
            'start_time', 'end_time', 'emotion_intensity', 'order',
        ]
        read_only_fields = ['id', 'order']


class TranscriptSegmentUpdateSerializer(serializers.Serializer):
    """Serializer for editing transcript segments (text or speaker_label)."""

    text = serializers.CharField(required=False)
    speaker_label = serializers.CharField(required=False, max_length=100)

    def validate(self, data):
        if not data.get('text') and not data.get('speaker_label'):
            raise serializers.ValidationError(
                "text 또는 speaker_label 중 하나는 필수입니다."
            )
        return data


class TranscriptEditSerializer(serializers.ModelSerializer):
    """Serializer for transcript edit audit records."""

    class Meta:
        model = TranscriptEdit
        fields = ['id', 'segment', 'edited_by', 'field_changed', 'old_value', 'new_value', 'created_at']
        read_only_fields = ['id', 'created_at']


class AudioRecordingSerializer(serializers.ModelSerializer):
    """Serializer for audio recording list/detail."""

    class Meta:
        model = AudioRecording
        fields = [
            'id', 'recording_type', 'status', 'duration',
            'full_text', 'emotion_intensity', 'post_action',
            'error_message', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'duration', 'full_text', 'error_message', 'created_at', 'updated_at']


class AudioRecordingCreateSerializer(serializers.Serializer):
    """Serializer for audio upload validation."""

    audio = serializers.FileField()
    type = serializers.ChoiceField(choices=['narration', 'live'])
    consent_session_id = serializers.UUIDField(required=False)

    def validate_audio(self, value):
        """Validate audio file size."""
        max_size = settings.MAX_AUDIO_FILE_SIZE
        if value.size > max_size:
            raise serializers.ValidationError(
                f"파일 크기가 {max_size // (1024 * 1024)}MB를 초과합니다."
            )
        return value

    def validate(self, data):
        """For live recordings, consent_session_id is required."""
        if data['type'] == 'live' and not data.get('consent_session_id'):
            raise serializers.ValidationError({
                'consent_session_id': '실시간 녹음에는 동의 세션 ID가 필요합니다.'
            })
        return data


class TranscriptDetailSerializer(serializers.ModelSerializer):
    """Serializer for full transcript detail with nested segments."""

    segments = TranscriptSegmentSerializer(many=True, read_only=True)

    class Meta:
        model = AudioRecording
        fields = [
            'id', 'recording_type', 'status', 'duration',
            'full_text', 'emotion_intensity', 'post_action',
            'error_message', 'created_at', 'updated_at',
            'segments',
        ]
        read_only_fields = fields


class SpeakerMapSerializer(serializers.Serializer):
    """Serializer for bulk speaker label assignment."""

    speaker_map = serializers.DictField(
        child=serializers.CharField(max_length=100),
        help_text='Map of speaker codes to labels, e.g. {"A": "나", "B": "파트너"}'
    )


class PostActionSerializer(serializers.Serializer):
    """Serializer for setting post-transcription action."""

    action = serializers.ChoiceField(choices=['reframe', 'comfort', 'keep'])
