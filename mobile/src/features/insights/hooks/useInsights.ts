/**
 * Hooks for fetching insight data from the patterns API.
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type {
  DashboardData,
  WeeklySummaryData,
  SessionInsight,
  PaginatedResponse,
  HealthScoreData,
  HealthScoreHistoryResponse,
} from '../types';

/**
 * Fetch aggregated dashboard data.
 */
export function useDashboard(days: number = 28) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<DashboardData>('/patterns/dashboard/', { params: { days } });
      setData(response.data);
    } catch (err: unknown) {
      setError('인사이트 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Fetch paginated weekly summaries.
 */
export function useWeeklySummaries(page: number = 1) {
  const [data, setData] = useState<PaginatedResponse<WeeklySummaryData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<PaginatedResponse<WeeklySummaryData>>(
        '/patterns/weekly/',
        { params: { page } },
      );
      setData(response.data);
    } catch (err: unknown) {
      setError('주간 요약을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Fetch session-level insight for a specific conversation.
 */
export function useSessionInsight(conversationId: string | null) {
  const [data, setData] = useState<SessionInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<SessionInsight>(
        `/patterns/session/${conversationId}/`,
      );
      setData(response.data);
    } catch (err: unknown) {
      // 404 is expected when no insight exists yet
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Fetch health score for the couple.
 */
export function useHealthScore(coupleId?: number) {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<HealthScoreData>('/patterns/health-score/');
      setData(response.data);
    } catch (err: unknown) {
      setError('건강 점수를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Fetch health score history.
 */
export function useHealthScoreHistory(days: number = 30) {
  const [data, setData] = useState<HealthScoreHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<HealthScoreHistoryResponse>(
        '/patterns/health-score/history/',
        { params: { days } },
      );
      setData(response.data);
    } catch (err: unknown) {
      setError('건강 점수 기록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
