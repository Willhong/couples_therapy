import { useState, useEffect, useCallback } from 'react';
import { getReports, getReportDetail, getUnreadCount } from '../api';
import type { InsightReportSummary, InsightReportDetail } from '../types';

export function useReports() {
  const [data, setData] = useState<InsightReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reports = await getReports();
      setData(reports);
    } catch (err: unknown) {
      setError('리포트를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useReportDetail(id: string) {
  const [data, setData] = useState<InsightReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const report = await getReportDetail(id);
      setData(report);
    } catch (err: unknown) {
      setError('리포트 상세를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useUnreadCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUnreadCount();
      setCount(result);
    } catch (err: unknown) {
      // Silently fail - not critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { count, loading, refetch: fetch };
}
