import { useState, useEffect, useCallback } from 'react';
import { getPartnerDashboard } from '../api';
import type { PartnerDashboardData } from '../types';

export function usePartnerDashboard() {
  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPartnerDashboard();
      setData(result);
    } catch (err: unknown) {
      setError('파트너 대시보드를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
