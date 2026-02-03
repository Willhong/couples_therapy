import { useState, useCallback, useRef, useEffect } from 'react';
import { API_URL } from '@/lib/api';
import { TokenStorage } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

/**
 * Consent request data
 */
export interface ConsentRequest {
  session_id: string;
  requester_id: number;
  requester_email?: string;
  expires_at: string;
}

/**
 * Consent status type
 */
export type ConsentStatus = 'idle' | 'pending' | 'approved' | 'declined' | 'expired' | 'withdrawn';

/**
 * WebSocket message types
 */
interface WebSocketMessage {
  type: string;
  session_id?: string;
  requester_id?: number;
  requester_email?: string;
  responder_id?: number;
  user_id?: number;
  email?: string;
  consented?: boolean;
  status?: string;
  expires_at?: string;
  withdrawn_by?: number;
  message?: string;
}

/**
 * Hook return type
 */
interface UseRecordingConsentReturn {
  consentRequest: ConsentRequest | null;
  myConsent: boolean;
  partnerConsent: boolean | null;
  partnerOnline: boolean;
  partnerRecordingStarted: boolean;
  partnerRequestedStop: boolean;
  status: ConsentStatus;
  error: string | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  initiateConsent: () => void;
  giveConsent: () => void;
  denyConsent: () => void;
  withdrawConsent: () => void;
  sendRecordingStarted: () => void;
  sendStopRecording: () => void;
  reset: () => void;
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Hook for managing recording consent via WebSocket
 */
export function useRecordingConsent(): UseRecordingConsentReturn {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // State
  const [consentRequest, setConsentRequest] = useState<ConsentRequest | null>(null);
  const [myConsent, setMyConsent] = useState(false);
  const [partnerConsent, setPartnerConsent] = useState<boolean | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerRecordingStarted, setPartnerRecordingStarted] = useState(false);
  const [partnerRequestedStop, setPartnerRequestedStop] = useState(false);
  const [status, setStatus] = useState<ConsentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  /**
   * Clean up WebSocket connection
   */
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);

      switch (data.type) {
        case 'consent_requested':
          // Received consent request from partner
          // Use Number() to ensure type-safe comparison (backend sends int, auth may have string)
          if (Number(data.requester_id) !== Number(user?.id)) {
            setConsentRequest({
              session_id: data.session_id!,
              requester_id: data.requester_id!,
              requester_email: data.requester_email,
              expires_at: data.expires_at!,
            });
            setStatus('pending');
            setPartnerConsent(true); // Requester implicitly consents
          }
          break;

        case 'consent_updated':
          // Partner responded to consent request
          if (Number(data.responder_id) !== Number(user?.id)) {
            setPartnerConsent(data.consented ?? false);
          }
          if (data.status === 'both_consented') {
            setStatus('approved');
          } else if (data.status === 'declined') {
            setStatus('declined');
          }
          break;

        case 'consent_withdrawn':
          setStatus('withdrawn');
          setConsentRequest(null);
          break;

        case 'user_joined':
          if (Number(data.user_id) !== Number(user?.id)) {
            setPartnerOnline(true);
          }
          break;

        case 'user_left':
          if (Number(data.user_id) !== Number(user?.id)) {
            setPartnerOnline(false);
          }
          break;

        case 'recording_started':
          // Partner started recording
          setPartnerRecordingStarted(true);
          break;

        case 'stop_recording':
          // Partner requested to stop recording
          setPartnerRequestedStop(true);
          break;

        case 'recording_stopped':
          // Partner stopped recording
          setPartnerRecordingStarted(false);
          setPartnerRequestedStop(false);
          break;

        case 'error':
          setError(data.message || '알 수 없는 오류가 발생했습니다.');
          break;

        default:
          console.log('Unknown WebSocket message type:', data.type);
      }
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  }, [user?.id]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    cleanup();

    try {
      const token = await TokenStorage.getAccessToken();
      if (!token) {
        setError('인증이 필요합니다.');
        return;
      }

      // Convert HTTP URL to WebSocket URL
      const wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      const fullUrl = `${wsUrl}/ws/consent/?token=${token}`;

      const ws = new WebSocket(fullUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code);
        setIsConnected(false);

        // Attempt reconnection if not intentional close
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('연결 오류가 발생했습니다.');
      };

      ws.onmessage = handleMessage;

      wsRef.current = ws;
    } catch (e) {
      console.error('Failed to connect WebSocket:', e);
      setError('연결에 실패했습니다.');
    }
  }, [cleanup, handleMessage]);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
    cleanup();
  }, [cleanup]);

  /**
   * Send message via WebSocket
   */
  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      setError('연결이 끊어졌습니다. 다시 시도해주세요.');
    }
  }, []);

  /**
   * Initiate consent request
   */
  const initiateConsent = useCallback(() => {
    const sessionId = generateUUID();
    setConsentRequest({
      session_id: sessionId,
      requester_id: user?.id || 0,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    setMyConsent(true);
    setPartnerConsent(null);
    setStatus('pending');
    setError(null);

    sendMessage({
      action: 'request_consent',
      session_id: sessionId,
    });
  }, [user?.id, sendMessage]);

  /**
   * Give consent (as responder)
   */
  const giveConsent = useCallback(() => {
    if (!consentRequest) {
      setError('동의 요청이 없습니다.');
      return;
    }

    setMyConsent(true);

    sendMessage({
      action: 'respond_consent',
      session_id: consentRequest.session_id,
      consented: true,
    });
  }, [consentRequest, sendMessage]);

  /**
   * Deny consent
   */
  const denyConsent = useCallback(() => {
    if (!consentRequest) {
      // If no request exists but we want to deny (e.g., closing modal as requester)
      reset();
      return;
    }

    sendMessage({
      action: 'respond_consent',
      session_id: consentRequest.session_id,
      consented: false,
    });

    setStatus('declined');
  }, [consentRequest, sendMessage]);

  /**
   * Withdraw consent (cancel pending request)
   */
  const withdrawConsent = useCallback(() => {
    if (!consentRequest) return;

    sendMessage({
      action: 'withdraw_consent',
      session_id: consentRequest.session_id,
    });

    reset();
  }, [consentRequest, sendMessage]);

  /**
   * Send recording started notification to partner
   */
  const sendRecordingStarted = useCallback(() => {
    if (!consentRequest) return;
    sendMessage({
      action: 'recording_started',
      session_id: consentRequest.session_id,
    });
  }, [consentRequest, sendMessage]);

  /**
   * Send stop recording request to partner
   */
  const sendStopRecording = useCallback(() => {
    if (!consentRequest) return;
    sendMessage({
      action: 'stop_recording',
      session_id: consentRequest.session_id,
    });
  }, [consentRequest, sendMessage]);

  /**
   * Reset state for new consent request
   */
  const reset = useCallback(() => {
    setConsentRequest(null);
    setMyConsent(false);
    setPartnerConsent(null);
    setPartnerRecordingStarted(false);
    setPartnerRequestedStop(false);
    setStatus('idle');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    consentRequest,
    myConsent,
    partnerConsent,
    partnerOnline,
    partnerRecordingStarted,
    partnerRequestedStop,
    status,
    error,
    isConnected,
    connect,
    disconnect,
    initiateConsent,
    giveConsent,
    denyConsent,
    withdrawConsent,
    sendRecordingStarted,
    sendStopRecording,
    reset,
  };
}
