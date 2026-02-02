"""Audio recording and transcription models.

AudioRecording stores recording metadata with encrypted transcript.
TranscriptSegment stores diarized segments with speaker labels and timestamps.
TranscriptEdit tracks user corrections for audit.
"""

import os
import uuid

from django.conf import settings
from django.db import models
from fernet_fields.fields import EncryptedTextField


class AudioRecording(models.Model):
    """Audio recording with transcription metadata."""

    class RecordingType(models.TextChoices):
        NARRATION = 'narration', 'Narration (single speaker)'
        LIVE = 'live', 'Live (multi-speaker)'

    class Status(models.TextChoices):
        UPLOADING = 'uploading', 'Uploading'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    class PostAction(models.TextChoices):
        REFRAME = 'reframe', 'Reframe'
        COMFORT = 'comfort', 'Comfort'
        KEEP = 'keep', 'Keep'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='audio_recordings'
    )
    conversation = models.ForeignKey(
        'chat.Conversation',
        on_delete=models.SET_NULL,
        related_name='audio_recordings',
        null=True, blank=True
    )
    couple = models.ForeignKey(
        'couples.Couple',
        on_delete=models.SET_NULL,
        related_name='audio_recordings',
        null=True, blank=True
    )

    recording_type = models.CharField(
        max_length=20,
        choices=RecordingType.choices,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UPLOADING,
    )
    error_message = models.TextField(null=True, blank=True)

    duration = models.FloatField(null=True, blank=True)
    full_text = EncryptedTextField(null=True, blank=True)
    audio_file = models.FileField(upload_to='audio/temp/', null=True, blank=True)
    emotion_intensity = models.IntegerField(null=True, blank=True)

    post_action = models.CharField(
        max_length=20,
        choices=PostAction.choices,
        null=True, blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'audio_recordings'
        ordering = ['-created_at']

    def __str__(self):
        return f"Recording {self.id} ({self.recording_type}) - {self.status}"

    def delete_audio_file(self):
        """Remove temporary audio file after transcription (privacy)."""
        if self.audio_file and os.path.isfile(self.audio_file.path):
            os.remove(self.audio_file.path)
            self.audio_file = None
            self.save(update_fields=['audio_file'])


class TranscriptSegment(models.Model):
    """Individual segment of a diarized transcript."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recording = models.ForeignKey(
        AudioRecording,
        on_delete=models.CASCADE,
        related_name='segments'
    )
    speaker = models.CharField(max_length=50)
    speaker_label = models.CharField(max_length=100, null=True, blank=True)
    text = EncryptedTextField()
    start_time = models.FloatField()
    end_time = models.FloatField()
    emotion_intensity = models.IntegerField(null=True, blank=True)
    order = models.IntegerField()

    class Meta:
        db_table = 'transcript_segments'
        ordering = ['order']

    def __str__(self):
        return f"Segment {self.order} ({self.speaker}): {str(self.text)[:50]}"


class TranscriptEdit(models.Model):
    """Audit trail for user corrections to transcript segments."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    segment = models.ForeignKey(
        TranscriptSegment,
        on_delete=models.CASCADE,
        related_name='edits'
    )
    edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transcript_edits'
    )
    field_changed = models.CharField(max_length=20)  # 'text' or 'speaker'
    old_value = models.TextField()
    new_value = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'transcript_edits'
        ordering = ['-created_at']

    def __str__(self):
        return f"Edit {self.id} on segment {self.segment_id} ({self.field_changed})"
