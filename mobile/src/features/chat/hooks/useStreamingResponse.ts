/**
 * Reframing response hook
 * Uses regular HTTP request (not SSE) for React Native compatibility
 */
import { useState, useCallback, useRef } from 'react';
import { TokenStorage } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import type { ReframingData } from '../types';

interface StreamResult {
  finalResponse: string;
  analysis?: ReframingData['analysis'];
  suggestions?: string[];
  messageId?: string; // Database UUID for the AI message
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
      // Cancel any existing request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsStreaming(true);
      setStatusMessage('분석 중...');
      setError(null);
      onStatus?.('분석 중...');

      let result: StreamResult = { finalResponse: '' };

      try {
        const token = await TokenStorage.getAccessToken();

        // Use regular reframe endpoint instead of streaming
        // React Native fetch doesn't support ReadableStream
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
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || '요청에 실패했습니다');
        }

        const data = await response.json();

        // Handle two-mode response
        if (data.mode === 'chat') {
          result = {
            finalResponse: data.message || '',
            analysis: undefined,
            suggestions: [],
            messageId: data.message_id,
          };
        } else {
          // reframing mode (backward-compatible with old format without mode field)
          result = {
            finalResponse: data.final_response || '',
            analysis: data.analysis,
            suggestions: data.suggestions || [],
            messageId: data.message_id,
          };
        }

        setIsStreaming(false);
        setStatusMessage('');
        onComplete?.(result);
        return result;
      } catch (error: unknown) {
        const err = error as Error;
        if (err.name === 'AbortError') {
          setIsStreaming(false);
          setStatusMessage('');
          return result;
        }
        setIsStreaming(false);
        setStatusMessage('');
        setError(err.message || '알 수 없는 오류가 발생했습니다');
        throw error;
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
