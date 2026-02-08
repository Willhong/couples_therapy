/**
 * Hook for managing cool-down timer state
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { cooldownApi } from '../services/cooldownApi';
import { CoolDown } from '../types';

export function useCoolDown() {
  const [cooldown, setCooldown] = useState<CoolDown | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate remaining time
  const calculateRemaining = useCallback((session: CoolDown): number => {
    const startedAt = new Date(session.started_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - startedAt) / 1000);
    const remaining = Math.max(0, session.duration_seconds - elapsed);
    return remaining;
  }, []);

  // Start a new cool-down session
  const startCooldown = useCallback(async (durationSeconds: number = 600) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await cooldownApi.startCooldown(durationSeconds);
      setCooldown(session);
      setRemainingSeconds(calculateRemaining(session));
    } catch (err: any) {
      setError(err.response?.data?.detail || '쿨다운 시작에 실패했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [calculateRemaining]);

  // Complete the current cool-down
  const completeCooldown = useCallback(async () => {
    if (!cooldown) return;

    setIsLoading(true);
    setError(null);
    try {
      await cooldownApi.completeCooldown(cooldown.id);
      setCooldown(null);
      setRemainingSeconds(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '쿨다운 완료에 실패했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cooldown]);

  // Cancel the current cool-down
  const cancelCooldown = useCallback(async () => {
    await completeCooldown();
  }, [completeCooldown]);

  // Timer effect
  useEffect(() => {
    if (!cooldown || !cooldown.is_active) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Update remaining time every second
    timerRef.current = setInterval(() => {
      const remaining = calculateRemaining(cooldown);
      setRemainingSeconds(remaining);

      // Auto-complete when timer reaches 0
      if (remaining <= 0) {
        completeCooldown();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [cooldown, calculateRemaining, completeCooldown]);

  return {
    cooldown,
    remainingSeconds,
    isLoading,
    error,
    startCooldown,
    completeCooldown,
    cancelCooldown,
  };
}
