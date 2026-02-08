/**
 * Hook for managing today's daily prompt
 */
import { useState, useEffect, useCallback } from 'react';
import { promptsApi } from '../services/promptsApi';
import type { DailyPromptAssignment } from '../types';

export function useDailyPrompt() {
  const [assignment, setAssignment] = useState<DailyPromptAssignment | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch today's prompt
  const fetchPrompt = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await promptsApi.getTodayPrompt();
      setAssignment(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '프롬프트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit response
  const submitResponse = useCallback(async (responseText: string) => {
    try {
      setSubmitting(true);
      setError(null);
      const data = await promptsApi.respondToPrompt(responseText);
      setAssignment(data);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.detail || '답변 제출에 실패했습니다.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Check if user has responded
  const hasUserResponded = useCallback(
    (userId: number): boolean => {
      if (!assignment) return false;
      return assignment.responses.some((r) => r.user === userId);
    },
    [assignment]
  );

  // Get user's response
  const getUserResponse = useCallback(
    (userId: number): string | null => {
      if (!assignment) return null;
      const response = assignment.responses.find((r) => r.user === userId);
      return response?.response_text || null;
    },
    [assignment]
  );

  // Load on mount
  useEffect(() => {
    fetchPrompt();
  }, [fetchPrompt]);

  return {
    assignment,
    loading,
    submitting,
    error,
    submitResponse,
    hasUserResponded,
    getUserResponse,
    refresh: fetchPrompt,
  };
}
