/**
 * Transcript feature type definitions
 * Re-exports shared types from recording module and adds transcript-specific types
 */
export type {
  TranscriptSegment,
  TranscriptResult,
  PostTranscriptAction,
  RecordingMode,
} from '@/features/recording/types';

/** Maps speaker codes (e.g. 'SPEAKER_00') to display names */
export type SpeakerMap = Record<string, string>;

/** State for the transcript editing flow */
export interface TranscriptState {
  segments: import('@/features/recording/types').TranscriptSegment[];
  speakerMap: SpeakerMap;
  isEditing: boolean;
  editingSegmentId: string | null;
}

/** Audio player state */
export interface AudioPlayerState {
  isPlaying: boolean;
  position: number; // milliseconds
  duration: number; // milliseconds
  isAvailable: boolean;
}
