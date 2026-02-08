/**
 * Waveform data hook for visualization
 * Manages a sliding window of metering values for rendering bars
 * Uses throttling to batch state updates and reduce re-renders
 */
import { useState, useCallback, useRef } from 'react';

interface UseWaveformReturn {
  waveformData: number[];
  addMeteringValue: (value: number) => void;
  reset: () => void;
}

/** Throttle interval for batching waveform state updates */
const THROTTLE_MS = 150;

export function useWaveform(maxBars: number = 50): UseWaveformReturn {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const dataRef = useRef<number[]>([]);
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushUpdate = useCallback(() => {
    setWaveformData([...dataRef.current]);
    pendingUpdateRef.current = null;
  }, []);

  /**
   * Add a new metering value and slide the window if needed.
   * State updates are throttled to THROTTLE_MS intervals to reduce re-renders.
   */
  const addMeteringValue = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(1, value));
      const newData = [...dataRef.current, clamped];

      // Keep only the last maxBars values
      if (newData.length > maxBars) {
        newData.splice(0, newData.length - maxBars);
      }

      dataRef.current = newData;

      const now = Date.now();
      if (now - lastUpdateRef.current >= THROTTLE_MS) {
        // Enough time has passed, update immediately
        lastUpdateRef.current = now;
        setWaveformData([...dataRef.current]);
      } else if (!pendingUpdateRef.current) {
        // Schedule an update for remaining throttle window
        pendingUpdateRef.current = setTimeout(() => {
          lastUpdateRef.current = Date.now();
          flushUpdate();
        }, THROTTLE_MS - (now - lastUpdateRef.current));
      }
    },
    [maxBars, flushUpdate]
  );

  /**
   * Reset waveform data and clear any pending updates
   */
  const reset = useCallback(() => {
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    dataRef.current = [];
    setWaveformData([]);
  }, []);

  return {
    waveformData,
    addMeteringValue,
    reset,
  };
}
