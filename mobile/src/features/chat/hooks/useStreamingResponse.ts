/**
 * SSE streaming response hook for AI reframing
 * Handles Server-Sent Events with abort capability
 * Parses structured JSON events from backend
 */
import { useState, useCallback, useRef } from 'react';
import { TokenStorage } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import type { ReframingData } from '../types';

interface StreamEvent {
  type: 'status' | 'complete' | 'error';
  node?: string;
  message?: string;
  final_response?: string;
  analysis?: ReframingData['analysis'];
  suggestions?: string[];
}

interface StreamResult {
  finalResponse: string;
  analysis?: ReframingData['analysis'];
  suggestions?: string[];
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
      // Cancel any existing stream
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsStreaming(true);
      setStatusMessage('');
      setError(null);

      let result: StreamResult = { finalResponse: '' };

      try {
        const token = await TokenStorage.getAccessToken();
        const response = await fetch(`${API_URL}/api/v1/chat/stream-reframe/`, {
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
          const errorText = await response.text();
          throw new Error(errorText || '스트리밍 요청에 실패했습니다');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('스트리밍을 시작할 수 없습니다');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();

              if (data === '[DONE]') {
                onComplete?.(result);
                setIsStreaming(false);
                return result;
              }

              // Parse JSON event
              try {
                const event: StreamEvent = JSON.parse(data);

                if (event.type === 'status') {
                  const msg = event.message || '';
                  setStatusMessage(msg);
                  onStatus?.(msg);
                } else if (event.type === 'complete') {
                  result = {
                    finalResponse: event.final_response || '',
                    analysis: event.analysis,
                    suggestions: event.suggestions,
                  };
                } else if (event.type === 'error') {
                  throw new Error(event.message || '스트리밍 중 오류 발생');
                }
              } catch (parseError) {
                // If not valid JSON, log and continue
                console.warn('Failed to parse SSE event:', data);
              }
            }
          }
        }

        onComplete?.(result);
        setIsStreaming(false);
        return result;
      } catch (error: unknown) {
        const err = error as Error;
        if (err.name === 'AbortError') {
          setIsStreaming(false);
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
  }, []);

  return {
    isStreaming,
    statusMessage,
    error,
    startStreaming,
    stopStreaming,
  };
}
