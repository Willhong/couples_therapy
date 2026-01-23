/**
 * useOnboardingProgress hook
 * Manages onboarding status and API submission
 */

import { useState, useEffect, useCallback } from 'react';
import { onboardingApi } from '../services/onboardingApi';
import type { OnboardingStatus, UserProfile, UserGoals } from '../types';

interface UseOnboardingProgressReturn {
  status: OnboardingStatus | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  submitOnboarding: (profile: UserProfile, goals: UserGoals) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing onboarding progress and submission
 */
export function useOnboardingProgress(): UseOnboardingProgressReturn {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current onboarding status from API
   */
  const fetchStatus = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const data = await onboardingApi.getStatus();
      setStatus(data);
    } catch (err: unknown) {
      // If 404, user hasn't started onboarding yet - that's okay
      const axiosError = err as { response?: { status?: number } };
      if (axiosError.response?.status !== 404) {
        setError('상태를 불러올 수 없습니다');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load status on mount
   */
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  /**
   * Submit both profile and goals to complete onboarding
   */
  const submitOnboarding = useCallback(
    async (profile: UserProfile, goals: UserGoals): Promise<boolean> => {
      setSubmitting(true);
      setError(null);

      try {
        // Save profile first
        await onboardingApi.saveProfile(profile);

        // Then save goals
        await onboardingApi.saveGoals(goals);

        // Refresh status to confirm completion
        await fetchStatus();

        return true;
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(
          axiosError.response?.data?.error || '저장에 실패했습니다. 다시 시도해주세요.'
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchStatus]
  );

  return {
    status,
    loading,
    submitting,
    error,
    submitOnboarding,
    refetch: fetchStatus,
  };
}
