/**
 * Hook for fetching and managing the unified conversation list.
 *
 * Provides pagination, pull-to-refresh, and infinite scroll.
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { ConversationEntry, ConversationListResponse } from '../types';

interface UseConversationsResult {
  conversations: ConversationEntry[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useConversations(): UseConversationsResult {
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(null);

  const fetchPage = useCallback(async (page: number, append: boolean) => {
    try {
      const response = await api.get<ConversationListResponse>(
        '/conversations/',
        { params: { page, page_size: 20 } }
      );
      const data = response.data;

      setConversations((prev) =>
        append ? [...prev, ...data.results] : data.results
      );
      setNextPage(data.next);
      setError(null);
    } catch (err) {
      setError('대화 목록을 불러올 수 없습니다.');
    }
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await fetchPage(1, false);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [fetchPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(1, false);
    setRefreshing(false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (nextPage === null) return;
    await fetchPage(nextPage, true);
  }, [nextPage, fetchPage]);

  return {
    conversations,
    loading,
    refreshing,
    error,
    hasMore: nextPage !== null,
    refresh,
    loadMore,
  };
}
