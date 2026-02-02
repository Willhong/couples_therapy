/**
 * Record screen - renders RecordingScreen from recording feature
 * After transcription completes, routes based on recording mode:
 *   narration -> post-recording-choice (choose before viewing transcript)
 *   live -> transcript/[id] (view diarized content first)
 */
import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { RecordingScreen } from '@/features/recording/components/RecordingScreen';
import type { RecordingMode, TranscriptResult } from '@/features/recording/types';

export default function RecordScreenPage(): React.ReactElement {
  const router = useRouter();

  const handleTranscriptionComplete = useCallback(
    (recordingId: string, mode: RecordingMode, _result: TranscriptResult) => {
      if (mode === 'narration') {
        // Self-narration: show choice screen BEFORE transcript
        router.push({
          pathname: '/(main)/post-recording-choice',
          params: { recordingId },
        });
      } else {
        // Live recording: go directly to transcript view
        router.push({
          pathname: '/(main)/transcript/[id]',
          params: { id: recordingId },
        });
      }
    },
    [router]
  );

  return (
    <RecordingScreen onTranscriptionComplete={handleTranscriptionComplete} />
  );
}
