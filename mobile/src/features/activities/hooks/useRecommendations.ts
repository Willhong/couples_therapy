import { useState, useEffect, useCallback } from 'react';
import { getRecommendations } from '../api';
import type { Recommendation } from '../types';

interface UseRecommendationsResult {
  data: Recommendation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRecommendations(): UseRecommendationsResult {
  const [data, setData] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRecommendations();
      setData(result);
    } catch {
      setError('추천 활동을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
