/**
 * Hook for fetching prompt history from the API.
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { DailyPromptAssignment } from '../types';

interface UsePromptHistoryResult {
  history: DailyPromptAssignment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePromptHistory(): UsePromptHistoryResult {
  const [history, setHistory] = useState<DailyPromptAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<DailyPromptAssignment[]>('/prompts/history/');
      // Only show prompts where both partners responded
      setHistory(response.data.filter((item) => item.both_responded));
    } catch (err) {
      setError('대화 기록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { history, loading, error, refetch: fetch };
}
