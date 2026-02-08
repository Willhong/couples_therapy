/**
 * Hook for managing safety status
 */
import { useState, useEffect } from 'react';
import { safetyApi } from '../services/safetyApi';
import { SafetyAssessment } from '../types';
import { getApiErrorMessage } from '@/lib/api';

export function useSafetyStatus() {
  const [status, setStatus] = useState<SafetyAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await safetyApi.getSafetyStatus();
      setStatus(data);
    } catch (err: any) {
      // 404 means not completed yet, which is not an error
      if (err.response?.status === 404) {
        setStatus(null);
      } else {
        setError(getApiErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return {
    status,
    loading,
    error,
    reload: loadStatus,
  };
}
