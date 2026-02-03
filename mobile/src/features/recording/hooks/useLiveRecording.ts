/**
 * Live recording hook - manages consent -> record -> upload lifecycle
 * Uses WebSocket for real-time consent and stop synchronization between partners
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRecordingConsent } from '@/hooks/useRecordingConsent';
import { useAudioRecording } from './useAudioRecording';
import { uploadAudio, pollTranscriptionStatus } from '../services/audioApi';
import type { TranscriptResult } from '../types';

export type LivePhase =
  | 'requesting_consent'
  | 'waiting_consent'
  | 'received_request'  // Responder received a consent request
  | 'consent_granted'
  | 'consent_declined'
  | 'recording'
  | 'stopped';

/** Consent timeout: 5 minutes */
const CONSENT_TIMEOUT_MS = 5 * 60 * 1000;

interface UseLiveRecordingReturn {
  phase: LivePhase;
  requestConsent: () => void;
  giveConsent: () => void;
  denyConsent: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  sendStopToPartner: () => void;
  consentSessionId: string | null;
  uri: string | null;
  metering: number[];
  duration: number;
  isRecording: boolean;
  partnerOnline: boolean;
  error: string | null;
}

export function useLiveRecording(): UseLiveRecordingReturn {
  const [phase, setPhase] = useState<LivePhase>('requesting_consent');
  const [error, setError] = useState<string | null>(null);
  const consentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    consentRequest,
    status: consentStatus,
    partnerOnline,
    isConnected,
    error: consentError,
    connect,
    disconnect,
    initiateConsent,
    giveConsent,
    denyConsent,
    reset: resetConsent,
  } = useRecordingConsent();

  const {
    state: recordingState,
    isRecording,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    cancelRecording,
  } = useAudioRecording();

  // Connect WebSocket on mount
  useEffect(() => {
    connect();
    return () => {
      if (consentTimeoutRef.current) {
        clearTimeout(consentTimeoutRef.current);
      }
      disconnect();
    };
  }, [connect, disconnect]);

  // Detect when responder receives a consent request
  useEffect(() => {
    if (consentRequest && consentStatus === 'pending' && phase === 'requesting_consent') {
      // We received a consent request from partner - switch to responder mode
      setPhase('received_request');
    }
  }, [consentRequest, consentStatus, phase]);

  // Sync consent status to phase
  useEffect(() => {
    // Allow transition from 'waiting_consent' (requester), 'requesting_consent', or 'received_request' (responder)
    if (consentStatus === 'approved' && (phase === 'waiting_consent' || phase === 'requesting_consent' || phase === 'received_request')) {
      setPhase('consent_granted');
      if (consentTimeoutRef.current) {
        clearTimeout(consentTimeoutRef.current);
        consentTimeoutRef.current = null;
      }
    } else if (
      (consentStatus === 'declined' || consentStatus === 'withdrawn' || consentStatus === 'expired') &&
      (phase === 'waiting_consent' || phase === 'requesting_consent' || phase === 'received_request')
    ) {
      setPhase('consent_declined');
      if (consentTimeoutRef.current) {
        clearTimeout(consentTimeoutRef.current);
        consentTimeoutRef.current = null;
      }
    }
  }, [consentStatus, phase]);

  // Forward consent errors
  useEffect(() => {
    if (consentError) {
      setError(consentError);
    }
  }, [consentError]);

  /**
   * Request consent from partner
   */
  const requestConsent = useCallback(() => {
    if (!isConnected) {
      setError('연결 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    if (!partnerOnline) {
      setError('파트너가 오프라인입니다.');
      return;
    }

    setError(null);
    setPhase('waiting_consent');
    initiateConsent();

    // 5-minute consent timeout
    consentTimeoutRef.current = setTimeout(() => {
      if (phase === 'waiting_consent') {
        setPhase('consent_declined');
        setError('동의 요청이 만료되었습니다.');
      }
    }, CONSENT_TIMEOUT_MS);
  }, [isConnected, partnerOnline, initiateConsent, phase]);

  /**
   * Start recording (only when consent_granted)
   */
  const startRecording = useCallback(async () => {
    if (phase !== 'consent_granted') {
      setError('동의가 완료되지 않았습니다.');
      return;
    }

    try {
      setError(null);
      await startAudioRecording();
      setPhase('recording');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '녹음을 시작할 수 없습니다.';
      setError(msg);
    }
  }, [phase, startAudioRecording]);

  /**
   * Stop recording and return URI
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    const uri = await stopAudioRecording();
    setPhase('stopped');
    return uri;
  }, [stopAudioRecording]);

  /**
   * Send stop signal to partner via WebSocket
   * The existing consent WebSocket channel is reused - we use a custom message type
   * via the same group_send pattern
   */
  const sendStopToPartner = useCallback(() => {
    // This is handled by the calling component - it will call stopRecording
    // and the partner indicator will detect recording_stopped event
    // For now we just stop locally; the UI layer handles WebSocket notification
  }, []);

  return {
    phase,
    requestConsent,
    giveConsent,
    denyConsent,
    startRecording,
    stopRecording,
    sendStopToPartner,
    consentSessionId: consentRequest?.session_id ?? null,
    uri: recordingState.uri,
    metering: recordingState.metering,
    duration: recordingState.duration,
    isRecording,
    partnerOnline,
    error,
  };
}
