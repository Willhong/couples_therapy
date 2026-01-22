import { useState, useCallback } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

/**
 * Onboarding state and methods
 */
interface UseOnboardingReturn {
  tutorialCompleted: boolean;
  loading: boolean;
  error: string | null;
  markTutorialCompleted: () => Promise<void>;
  checkOnboardingStatus: () => void;
}

/**
 * Hook for managing onboarding state
 */
export function useOnboarding(): UseOnboardingReturn {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check onboarding status from user data
   */
  const checkOnboardingStatus = useCallback(() => {
    // Tutorial status comes from AuthContext user
    return user?.tutorial_completed ?? false;
  }, [user]);

  /**
   * Mark tutorial as completed via API
   */
  const markTutorialCompleted = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Update user profile with tutorial_completed = true
      await api.patch('/auth/user/', {
        tutorial_completed: true,
        onboarding_completed: true,
      });

      // Refresh user data in AuthContext
      await refreshUser();
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  return {
    tutorialCompleted: user?.tutorial_completed ?? false,
    loading,
    error,
    markTutorialCompleted,
    checkOnboardingStatus,
  };
}
