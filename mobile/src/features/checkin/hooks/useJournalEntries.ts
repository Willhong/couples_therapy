/**
 * Hook for fetching journal entries (daily check-ins) from the API.
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface JournalEntry {
  id: number;
  mood: number;
  mood_display: string;
  note: string;
  answers: Record<string, any>;
  date: string;
  created_at: string;
}

interface UseJournalEntriesResult {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useJournalEntries(): UseJournalEntriesResult {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<JournalEntry[]>('/checkins/history/');
      setEntries(response.data);
    } catch (err) {
      setError('기록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { entries, loading, error, refetch: fetch };
}
