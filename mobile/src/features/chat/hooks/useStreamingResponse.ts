/**
 * Reframing response hook
 * Uses regular HTTP request (not SSE) for React Native compatibility
 */
import { useState, useCallback, useRef } from 'react';
import { TokenStorage } from '@/lib/auth';
import { API_URL, getApiErrorMessage } from '@/lib/api';
import type { ReframingData } from '../types';

interface StreamResult {
  finalResponse: string;
  analysis?: ReframingData['analysis'];
  suggestions?: string[];
  messageId?: string;
  mode?: 'chat' | 'reframing' | 'comfort' | 'crisis';
  crisisType?: string;
}

interface UseStreamingResponseReturn {
  isStreaming: boolean;
  statusMessage: string;
  error: string | null;
  startStreaming: (
    conversationId: string,
    message: string,
    onStatus?: (message: string) => void,
    onComplete?: (result: StreamResult) => void
  ) => Promise<StreamResult>;
  stopStreaming: () => void;
}

export function useStreamingResponse(): UseStreamingResponseReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(
    async (
      conversationId: string,
      message: string,
      onStatus?: (message: string) => void,
      onComplete?: (result: StreamResult) => void
    ): Promise<StreamResult> => {
      if (!conversationId || !message) {
        throw new Error('유효하지 않은 채팅 요청입니다.');
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsStreaming(true);
      setStatusMessage('요청 중입니다...');
      setError(null);
      onStatus?.('요청 중입니다...');

      let result: StreamResult = { finalResponse: '' };

      try {
        const token = await TokenStorage.getAccessToken();

        const response = await fetch(`${API_URL}/api/v1/chat/reframe/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            message,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => undefined);
          const message = getApiErrorMessage({
            response: { data: errorBody },
            message: `요청 실패: ${response.status}`,
          });
          throw new Error(message);
        }

        const data = await response.json();

        if (data.mode === 'chat') {
          result = {
            finalResponse: data.message || '',
            analysis: undefined,
            suggestions: [],
            messageId: data.message_id,
          };
        } else {
          result = {
            finalResponse: data.final_response || '',
            analysis: data.analysis,
            suggestions: data.suggestions || [],
            messageId: data.message_id,
            mode: data.mode,
            crisisType: data.crisis_type,
          };
        }

        setIsStreaming(false);
        setStatusMessage('');
        onComplete?.(result);
        return result;
      } catch (streamError: unknown) {
        if (streamError instanceof Error && streamError.name === 'AbortError') {
          setIsStreaming(false);
          setStatusMessage('');
          return result;
        }

        const message = getApiErrorMessage(streamError);
        setIsStreaming(false);
        setStatusMessage('');
        setError(message);
        throw new Error(message);
      }
    },
    []
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStatusMessage('');
  }, []);

  return {
    isStreaming,
    statusMessage,
    error,
    startStreaming,
    stopStreaming,
  };
}
