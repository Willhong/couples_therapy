/**
 * SSE streaming response hook for AI reframing
 * Handles Server-Sent Events with abort capability
 */
import { useState, useCallback, useRef } from 'react';
import { TokenStorage } from '@/lib/auth';
import { API_URL } from '@/lib/api';

interface StreamingState {
  isStreaming: boolean;
  streamedText: string;
  error: string | null;
}

interface UseStreamingResponseReturn extends StreamingState {
  startStreaming: (
    conversationId: string,
    message: string,
    onChunk?: (text: string) => void,
    onComplete?: (fullText: string) => void
  ) => Promise<string>;
  stopStreaming: () => void;
}

export function useStreamingResponse(): UseStreamingResponseReturn {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    streamedText: '',
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(
    async (
      conversationId: string,
      message: string,
      onChunk?: (text: string) => void,
      onComplete?: (fullText: string) => void
    ): Promise<string> => {
      // Cancel any existing stream
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setState({ isStreaming: true, streamedText: '', error: null });

      try {
        const token = await TokenStorage.getAccessToken();
        const response = await fetch(`${API_URL}/api/v1/chat/stream-reframing/`, {
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
          throw new Error('스트리밍 요청에 실패했습니다');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (!reader) {
          throw new Error('스트리밍을 시작할 수 없습니다');
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                onComplete?.(fullText);
                setState((prev) => ({ ...prev, isStreaming: false }));
                return fullText;
              }

              if (data.startsWith('[ERROR]')) {
                throw new Error(data.slice(8));
              }

              fullText += data;
              setState((prev) => ({ ...prev, streamedText: fullText }));
              onChunk?.(data);
            }
          }
        }

        onComplete?.(fullText);
        setState((prev) => ({ ...prev, isStreaming: false }));
        return fullText;
      } catch (error: unknown) {
        const err = error as Error;
        if (err.name === 'AbortError') {
          setState((prev) => ({ ...prev, isStreaming: false }));
          return state.streamedText;
        }
        setState({
          isStreaming: false,
          streamedText: '',
          error: err.message || '알 수 없는 오류가 발생했습니다',
        });
        throw error;
      }
    },
    [state.streamedText]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  return { ...state, startStreaming, stopStreaming };
}
