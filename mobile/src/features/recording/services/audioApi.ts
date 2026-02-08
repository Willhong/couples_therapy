/**
 * Audio recording API service
 * Handles upload, transcription polling, and transcript CRUD operations
 */
import { api } from '@/lib/api';
import {
  RecordingMode,
  PostTranscriptAction,
  TranscriptResult,
} from '../types';

interface UploadResponse {
  recording_id: string;
  status: string;
}

/**
 * Upload an audio recording to the backend
 */
export async function uploadAudio(
  uri: string,
  type: RecordingMode,
  consentSessionId?: string
): Promise<UploadResponse> {
  const formData = new FormData();

  // Append audio file
  formData.append('audio', {
    uri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as unknown as Blob);

  formData.append('type', type);

  if (consentSessionId) {
    formData.append('consent_session_id', consentSessionId);
  }

  const response = await api.post<UploadResponse>(
    '/audio/upload/',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 180000, // 3 minutes for large files on slow connections
    }
  );

  return response.data;
}

/**
 * Poll transcription status until completed or failed
 */
export async function pollTranscriptionStatus(
  recordingId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<TranscriptResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await api.get<TranscriptResult>(
      `/audio/${recordingId}/status/`
    );

    if (response.data.status === 'completed') {
      return response.data;
    }

    if (response.data.status === 'failed') {
      throw new Error('음성 처리에 실패했습니다. 다시 시도해주세요.');
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('음성 처리 시간이 초과되었습니다. 다시 시도해주세요.');
}

/**
 * Get transcript detail for a recording
 */
export async function getTranscript(
  recordingId: string
): Promise<TranscriptResult> {
  const response = await api.get<TranscriptResult>(
    `/audio/${recordingId}/transcript/`
  );
  return response.data;
}

/**
 * Update a transcript segment (text or speaker label)
 */
export async function updateSegment(
  recordingId: string,
  segmentId: string,
  data: { text?: string; speaker_label?: string }
): Promise<void> {
  await api.patch(
    `/audio/${recordingId}/segments/${segmentId}/`,
    data
  );
}

/**
 * Assign speaker labels to all segments
 */
export async function assignSpeakers(
  recordingId: string,
  speakerMap: Record<string, string>
): Promise<void> {
  await api.post(`/audio/${recordingId}/speakers/`, {
    speaker_map: speakerMap,
  });
}

interface PostActionResponse {
  conversation_id?: string;
  result?: {
    mode: string;
    final_response?: string;
    message_id?: string;
  };
}

/**
 * Set post-transcript action (reframe, comfort, or keep)
 */
export async function setPostAction(
  recordingId: string,
  action: PostTranscriptAction
): Promise<PostActionResponse> {
  const response = await api.post<PostActionResponse>(`/audio/${recordingId}/action/`, { action });
  return response.data;
}

/**
 * Delete a recording and its transcript
 */
export async function deleteRecording(
  recordingId: string
): Promise<void> {
  await api.delete(`/audio/${recordingId}/`);
}
