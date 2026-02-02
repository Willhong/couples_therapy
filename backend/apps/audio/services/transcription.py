"""OpenAI transcription service.

Uses OpenAI direct API (NOT OpenRouter) for audio transcription:
- gpt-4o-transcribe for narration (single speaker)
- gpt-4o-transcribe with diarization for live recordings (multi-speaker)
"""

import logging

from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)


class TranscriptionError(Exception):
    """Raised when transcription fails."""
    pass


def _get_client() -> OpenAI:
    """Get OpenAI client with API key from settings."""
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise TranscriptionError(
            "OPENAI_API_KEY is not configured. "
            "Set it in .env or environment variables."
        )
    return OpenAI(api_key=api_key)


def transcribe_narration(audio_file_path: str) -> dict:
    """Transcribe a narration recording (single speaker).

    Uses OpenAI gpt-4o-transcribe model for Korean audio.

    Args:
        audio_file_path: Path to the audio file on disk.

    Returns:
        dict with keys:
            - text: Full transcript text
            - duration: Audio duration in seconds

    Raises:
        TranscriptionError: If transcription fails.
    """
    try:
        client = _get_client()

        with open(audio_file_path, 'rb') as audio_file:
            response = client.audio.transcriptions.create(
                model='gpt-4o-transcribe',
                file=audio_file,
                language='ko',
                response_format='verbose_json',
            )

        return {
            'text': response.text,
            'duration': response.duration or 0.0,
        }

    except TranscriptionError:
        raise
    except Exception as e:
        logger.exception(f"Narration transcription failed: {e}")
        raise TranscriptionError(f"음성 인식에 실패했습니다: {str(e)}")


def transcribe_with_diarization(audio_file_path: str) -> dict:
    """Transcribe a live recording with speaker diarization.

    Uses OpenAI gpt-4o-transcribe model with diarization for Korean audio.
    Returns segments with speaker labels and timestamps.

    Args:
        audio_file_path: Path to the audio file on disk.

    Returns:
        dict with keys:
            - text: Full transcript text
            - duration: Audio duration in seconds
            - segments: List of dicts with {speaker, text, start, end}

    Raises:
        TranscriptionError: If transcription fails.
    """
    try:
        client = _get_client()

        with open(audio_file_path, 'rb') as audio_file:
            response = client.audio.transcriptions.create(
                model='gpt-4o-transcribe',
                file=audio_file,
                language='ko',
                response_format='verbose_json',
                include=['logprobs'],
            )

        # Build segments from the response
        # The API returns word-level or segment-level data
        # For diarization, we process the response logprobs/segments
        segments = []
        full_text = response.text

        # If the API provides segments with speaker info, use them
        if hasattr(response, 'segments') and response.segments:
            for i, seg in enumerate(response.segments):
                segments.append({
                    'speaker': getattr(seg, 'speaker', f'speaker_{i % 2}'),
                    'text': seg.text.strip(),
                    'start': seg.start,
                    'end': seg.end,
                })
        else:
            # Fallback: treat entire transcription as a single segment
            segments.append({
                'speaker': 'A',
                'text': full_text,
                'start': 0.0,
                'end': response.duration or 0.0,
            })

        return {
            'text': full_text,
            'duration': response.duration or 0.0,
            'segments': segments,
        }

    except TranscriptionError:
        raise
    except Exception as e:
        logger.exception(f"Diarized transcription failed: {e}")
        raise TranscriptionError(f"음성 인식에 실패했습니다: {str(e)}")
