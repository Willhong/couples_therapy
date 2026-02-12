import { useState, useEffect, useCallback } from 'react';
import { getMoodInsights } from '../api';
import type { MoodInsightsData } from '../api';

export function useMoodInsights(days: number = 30) {
  const [data, setData] = useState<MoodInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMoodInsights(days);
      setData(result);
    } catch (err: unknown) {
      setError('기분 인사이트를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
