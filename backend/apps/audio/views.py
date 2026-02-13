"""Views for audio recording and transcription API."""

import logging
import tempfile
import os

from asgiref.sync import async_to_sync
from django.db import models
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.consents.models import RecordingConsent
from apps.couples.models import Couple

from .models import AudioRecording, TranscriptSegment, TranscriptEdit
from .serializers import (
    AudioRecordingSerializer,
    AudioRecordingCreateSerializer,
    TranscriptSegmentSerializer,
    TranscriptSegmentUpdateSerializer,
    TranscriptDetailSerializer,
    SpeakerMapSerializer,
    PostActionSerializer,
)
from .tasks import transcribe_audio

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_audio(request):
    """Upload audio file and queue transcription.

    Accepts multipart form with 'audio' file and 'type' field.
    For 'live' type, requires 'consent_session_id' with BOTH_CONSENTED status.

    Returns recording_id and processing status.
    """
    serializer = AudioRecordingCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    user = request.user
    recording_type = data['type']

    # For live recordings, perform thorough consent validation
    couple = None
    if recording_type == 'live':
        consent_session_id = data.get('consent_session_id')
        if not consent_session_id:
            return Response(
                {'detail': '실시간 녹음에는 동의 세션 ID가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            consent = RecordingConsent.objects.get(session_id=consent_session_id)
        except RecordingConsent.DoesNotExist:
            return Response(
                {'detail': '유효한 녹음 동의를 찾을 수 없습니다.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validate consent status is BOTH_CONSENTED
        if consent.status != RecordingConsent.Status.BOTH_CONSENTED:
            return Response(
                {'detail': f'동의 상태가 올바르지 않습니다: {consent.get_status_display()}'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validate consent is not expired
        if timezone.now() > consent.expires_at:
            return Response(
                {'detail': '동의가 만료되었습니다. 새로운 동의를 요청해주세요.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validate the uploader is part of the consent (requester or responder)
        if user != consent.requester and user != consent.responder:
            return Response(
                {'detail': '이 동의 세션에 대한 권한이 없습니다.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        couple = consent.couple
    else:
        # For narration, try to find user's couple
        couple = Couple.objects.filter(
            (models.Q(user1=user) | models.Q(user2=user)),
            status=Couple.Status.ACTIVE
        ).first()

    # Create recording
    recording = AudioRecording.objects.create(
        user=user,
        couple=couple,
        recording_type=recording_type,
        status=AudioRecording.Status.UPLOADING,
        audio_file=data['audio'],
    )

    # Update status and queue transcription
    recording.status = AudioRecording.Status.PROCESSING
    recording.save(update_fields=['status'])

    transcribe_audio.delay(str(recording.id))

    return Response(
        {
            'recording_id': str(recording.id),
            'status': 'processing',
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recording_status(request, recording_id):
    """Return recording status and transcript if completed.

    If transcription is complete, includes full transcript segments.
    """
    try:
        recording = AudioRecording.objects.get(
            id=recording_id,
            user=request.user,
        )
    except AudioRecording.DoesNotExist:
        return Response(
            {'detail': '녹음을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if recording.status == AudioRecording.Status.COMPLETED:
        serializer = TranscriptDetailSerializer(recording)
    else:
        serializer = AudioRecordingSerializer(recording)

    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transcript_detail(request, recording_id):
    """Return full transcript with segments."""
    try:
        recording = AudioRecording.objects.get(
            id=recording_id,
            user=request.user,
        )
    except AudioRecording.DoesNotExist:
        return Response(
            {'detail': '녹음을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if recording.status != AudioRecording.Status.COMPLETED:
        return Response(
            {'detail': '아직 변환이 완료되지 않았습니다.', 'status': recording.status},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = TranscriptDetailSerializer(recording)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_segment(request, recording_id, segment_id):
    """Update a transcript segment (text or speaker_label).

    Creates a TranscriptEdit audit record for the change.
    """
    try:
        recording = AudioRecording.objects.get(
            id=recording_id,
            user=request.user,
        )
    except AudioRecording.DoesNotExist:
        return Response(
            {'detail': '녹음을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        segment = TranscriptSegment.objects.get(
            id=segment_id,
            recording=recording,
        )
    except TranscriptSegment.DoesNotExist:
        return Response(
            {'detail': '세그먼트를 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = TranscriptSegmentUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # Update text if provided
    if 'text' in data:
        TranscriptEdit.objects.create(
            segment=segment,
            edited_by=request.user,
            field_changed='text',
            old_value=segment.text,
            new_value=data['text'],
        )
        segment.text = data['text']

    # Update speaker_label if provided
    if 'speaker_label' in data:
        TranscriptEdit.objects.create(
            segment=segment,
            edited_by=request.user,
            field_changed='speaker',
            old_value=segment.speaker_label or '',
            new_value=data['speaker_label'],
        )
        segment.speaker_label = data['speaker_label']

    segment.save()

    return Response(TranscriptSegmentSerializer(segment).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_speakers(request, recording_id):
    """Bulk update speaker labels for all segments matching a speaker code.

    Body: {"speaker_map": {"A": "나", "B": "파트너"}}
    Updates all segments' speaker_label for the recording.
    """
    try:
        recording = AudioRecording.objects.get(
            id=recording_id,
            user=request.user,
        )
    except AudioRecording.DoesNotExist:
        return Response(
            {'detail': '녹음을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = SpeakerMapSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    speaker_map = serializer.validated_data['speaker_map']
    updated_count = 0

    for speaker_code, label in speaker_map.items():
        count = TranscriptSegment.objects.filter(
            recording=recording,
            speaker=speaker_code,
        ).update(speaker_label=label)
        updated_count += count

    return Response({
        'updated_count': updated_count,
        'speaker_map': speaker_map,
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_recording(request, recording_id):
    """Delete a recording and all its segments.

    Either the recording owner or their partner can delete.
    """
    try:
        recording = AudioRecording.objects.get(id=recording_id)
    except AudioRecording.DoesNotExist:
        return Response(
            {'detail': '녹음을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    user = request.user

    # Check ownership: either the uploader or their partner
    if recording.user != user:
        # Check if user is the partner
        if recording.couple:
            couple = recording.couple
            if user != couple.user1 and user != couple.user2:
                return Response(
                    {'detail': '삭제 권한이 없습니다.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            return Response(
                {'detail': '삭제 권한이 없습니다.'},
                status=status.HTTP_403_FORBIDDEN,
            )

    # Delete audio file if it still exists
    recording.delete_audio_file()
    recording.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_post_action(request, recording_id):
    """Set post-transcription action for a recording.

    Actions:
    - 'reframe': Run reframing pipeline on transcript
    - 'comfort': Run comfort pipeline (empathetic response)
    - 'keep': Save transcript without AI processing
    """
    try:
        recording = AudioRecording.objects.get(
            id=recording_id,
            user=request.user,
        )
    except AudioRecording.DoesNotExist:
        return Response(
            {'detail': '녹음을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if recording.status != AudioRecording.Status.COMPLETED:
        return Response(
            {'detail': '아직 변환이 완료되지 않았습니다.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = PostActionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    action = serializer.validated_data['action']
    recording.post_action = action
    recording.save(update_fields=['post_action'])

    response_data = {
        'recording_id': str(recording.id),
        'post_action': action,
    }

    if action == 'reframe':
        # Run reframing pipeline on full transcript
        from apps.chat.services.reframing_graph import run_reframing_pipeline
        from apps.chat.models import Conversation, Message

        try:
            # Create or get conversation for this recording
            if not recording.conversation:
                conversation = Conversation.objects.create(
                    user=request.user,
                    couple=recording.couple,
                    title=f"녹음 리프레이밍 ({recording.created_at.strftime('%Y-%m-%d')})",
                )
                recording.conversation = conversation
                recording.save(update_fields=['conversation'])
            else:
                conversation = recording.conversation

            # Save transcript as user message
            user_msg = Message.objects.create(
                conversation=conversation,
                role=Message.Role.USER,
                content=recording.full_text,
            )

            # Run reframing pipeline
            result = async_to_sync(run_reframing_pipeline)(
                user_message=recording.full_text,
            )

            # Save AI response
            is_reframing = result.get('mode') == 'reframing'
            ai_msg = Message.objects.create(
                conversation=conversation,
                role=Message.Role.ASSISTANT,
                content=result['final_response'],
                has_reframing=is_reframing,
                reframing_data={
                    'analysis': result.get('analysis'),
                    'suggestions': result.get('suggestions', []),
                    'is_abuse_detected': result.get('is_abuse_detected', False),
                } if is_reframing else None,
            )

            response_data['conversation_id'] = str(conversation.id)
            response_data['result'] = {
                'mode': result.get('mode'),
                'final_response': result.get('final_response'),
                'message_id': str(ai_msg.id),
            }

        except Exception as e:
            logger.exception(f"Reframing failed for recording {recording_id}: {e}")
            response_data['error'] = '리프레이밍 처리 중 오류가 발생했습니다.'

    elif action == 'comfort':
        # Run comfort pipeline
        from apps.chat.services.reframing_graph import run_comfort_pipeline
        from apps.chat.models import Conversation, Message

        try:
            if not recording.conversation:
                conversation = Conversation.objects.create(
                    user=request.user,
                    couple=recording.couple,
                    title=f"위로 모드 ({recording.created_at.strftime('%Y-%m-%d')})",
                )
                recording.conversation = conversation
                recording.save(update_fields=['conversation'])
            else:
                conversation = recording.conversation

            # Save transcript as user message
            user_msg = Message.objects.create(
                conversation=conversation,
                role=Message.Role.USER,
                content=recording.full_text,
            )

            # Run comfort pipeline
            result = async_to_sync(run_comfort_pipeline)(
                user_message=recording.full_text,
            )

            ai_msg = Message.objects.create(
                conversation=conversation,
                role=Message.Role.ASSISTANT,
                content=result['final_response'],
            )

            response_data['conversation_id'] = str(conversation.id)
            response_data['result'] = {
                'mode': 'comfort',
                'final_response': result.get('final_response'),
                'message_id': str(ai_msg.id),
            }

        except Exception as e:
            logger.exception(f"Comfort pipeline failed for recording {recording_id}: {e}")
            response_data['error'] = '위로 모드 처리 중 오류가 발생했습니다.'

    # action == 'keep': just save the action, no AI call

    return Response(response_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quick_transcribe(request):
    """Lightweight transcription endpoint for voice input.

    Accepts audio file, transcribes via OpenAI, returns text directly.
    Does NOT create AudioRecording records or run diarization.
    """
    audio_file = request.FILES.get('audio')
    if not audio_file:
        return Response(
            {'detail': '오디오 파일이 필요합니다.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Save to temp file
        suffix = os.path.splitext(audio_file.name)[1] if audio_file.name else '.m4a'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in audio_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        # Transcribe using existing service
        from apps.audio.services.transcription import transcribe_narration
        result = transcribe_narration(tmp_path)

        return Response({'text': result['text']})
    except Exception as e:
        logger.exception(f"Quick transcribe failed: {e}")
        return Response(
            {'detail': '음성 변환에 실패했습니다.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    finally:
        # Clean up temp file
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
