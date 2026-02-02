/**
 * Recording feature barrel exports
 */
export { RecordingScreen } from './components/RecordingScreen';
export { LiveConsentFlow } from './components/LiveConsentFlow';
export { PartnerRecordingIndicator } from './components/PartnerRecordingIndicator';
export { useLiveRecording } from './hooks/useLiveRecording';
export type { LivePhase } from './hooks/useLiveRecording';
export type {
  RecordingMode,
  RecordingStatus,
  RecordingState,
  TranscriptSegment,
  TranscriptResult,
  GuidedPrompt,
  PostTranscriptAction,
} from './types';
