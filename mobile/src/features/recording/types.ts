/**
 * Recording feature type definitions
 */

export type RecordingMode = 'narration' | 'live';

export type RecordingStatus =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed';

export type PostTranscriptAction = 'reframe' | 'comfort' | 'keep';

export interface RecordingState {
  status: RecordingStatus;
  duration: number; // seconds
  uri: string | null;
  metering: number[]; // normalized 0-1 values
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  speaker_label: string | null;
  text: string;
  start_time: number;
  end_time: number;
  emotion_intensity: number | null;
  order: number;
}

export interface TranscriptResult {
  recording_id: string;
  status: string;
  duration: number | null;
  full_text: string | null;
  segments: TranscriptSegment[];
}

export interface GuidedPrompt {
  id: string;
  text: string;
  category: 'situation' | 'emotion' | 'need';
}
