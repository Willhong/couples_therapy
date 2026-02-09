"""Celery tasks for audio processing.

Async transcription task queued after audio upload.
Audio file is always deleted after transcription (privacy).
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def transcribe_audio(self, recording_id: str):
    """Transcribe an audio recording asynchronously.

    1. Load AudioRecording by id
    2. Call appropriate transcription service based on recording_type
    3. Create TranscriptSegment records
    4. Update recording status and full_text
    5. Always delete audio file after (privacy)

    Args:
        recording_id: UUID string of the AudioRecording to process.
    """
    from apps.audio.models import AudioRecording, TranscriptSegment
    from apps.audio.services.transcription import (
        transcribe_narration,
        transcribe_with_diarization,
        TranscriptionError,
    )

    try:
        recording = AudioRecording.objects.get(id=recording_id)
    except AudioRecording.DoesNotExist:
        logger.error(f"Recording {recording_id} not found")
        return

    # Update status to processing
    recording.status = AudioRecording.Status.PROCESSING
    recording.save(update_fields=['status'])

    try:
        audio_path = recording.audio_file.path

        if recording.recording_type == AudioRecording.RecordingType.NARRATION:
            # Single speaker narration
            result = transcribe_narration(audio_path)

            # Create single segment
            TranscriptSegment.objects.create(
                recording=recording,
                speaker='user',
                text=result['text'],
                start_time=0.0,
                end_time=result['duration'],
                order=0,
            )

        elif recording.recording_type == AudioRecording.RecordingType.LIVE:
            # Multi-speaker live recording
            result = transcribe_with_diarization(audio_path)

            # Create segments from diarization
            for i, seg in enumerate(result.get('segments', [])):
                TranscriptSegment.objects.create(
                    recording=recording,
                    speaker=seg['speaker'],
                    text=seg['text'],
                    start_time=seg['start'],
                    end_time=seg['end'],
                    order=i,
                )
        else:
            raise TranscriptionError(
                f"Unknown recording type: {recording.recording_type}"
            )

        # Update recording with results
        recording.status = AudioRecording.Status.COMPLETED
        recording.duration = result['duration']
        recording.full_text = result['text']
        recording.save(update_fields=['status', 'duration', 'full_text'])

        # Create a linked Conversation entry for the unified list
        conversation = _create_conversation_for_recording(recording)

        # Chain pattern analysis after transcription
        try:
            from apps.patterns.tasks import analyze_patterns
            analyze_patterns.delay(str(conversation.id))
        except Exception as e:
            logger.warning(f"Failed to queue pattern analysis for {recording_id}: {e}")

        logger.info(f"Transcription completed for recording {recording_id}")

    except TranscriptionError as e:
        logger.error(f"Transcription failed for {recording_id}: {e}")
        recording.status = AudioRecording.Status.FAILED
        recording.error_message = str(e)
        recording.save(update_fields=['status', 'error_message'])

    except Exception as e:
        logger.exception(f"Unexpected error transcribing {recording_id}: {e}")
        recording.status = AudioRecording.Status.FAILED
        recording.error_message = f"예상치 못한 오류가 발생했습니다: {str(e)}"
        recording.save(update_fields=['status', 'error_message'])

        # Retry on unexpected errors
        try:
            self.retry(exc=e)
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for recording {recording_id}")

    finally:
        # CRITICAL: Always delete the audio file for privacy
        try:
            recording.refresh_from_db()
            recording.delete_audio_file()
        except Exception as e:
            logger.error(f"Failed to delete audio file for {recording_id}: {e}")


def _create_conversation_for_recording(recording):
    """Create a Conversation entry linked to a completed audio recording.

    Maps recording_type to ConversationType and populates summary from
    the first 200 characters of the transcript.
    """
    from apps.chat.models import Conversation

    type_map = {
        'narration': Conversation.ConversationType.NARRATION,
        'live': Conversation.ConversationType.LIVE,
    }
    conv_type = type_map.get(recording.recording_type, Conversation.ConversationType.NARRATION)

    # Generate a short title from the transcript
    full_text = str(recording.full_text or '')
    title = full_text[:50].strip()
    if len(full_text) > 50:
        title += '...'
    if not title:
        title = '녹음 대화'

    summary = full_text[:200].strip()

    conversation = Conversation.objects.create(
        user=recording.user,
        couple=recording.couple,
        title=title,
        conversation_type=conv_type,
        summary=summary,
        emotion_indicator=recording.emotion_intensity,
    )

    # Link the recording to this conversation
    recording.conversation = conversation
    recording.save(update_fields=['conversation'])

    logger.info(f"Created conversation {conversation.id} for recording {recording.id}")
    return conversation
