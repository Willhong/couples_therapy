/**
 * Waveform data hook for visualization
 * Manages a sliding window of metering values for rendering bars
 */
import { useState, useCallback, useRef } from 'react';

interface UseWaveformReturn {
  waveformData: number[];
  addMeteringValue: (value: number) => void;
  reset: () => void;
}

export function useWaveform(maxBars: number = 50): UseWaveformReturn {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const dataRef = useRef<number[]>([]);

  /**
   * Add a new metering value and slide the window if needed
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
      setWaveformData(newData);
    },
    [maxBars]
  );

  /**
   * Reset waveform data
   */
  const reset = useCallback(() => {
    dataRef.current = [];
    setWaveformData([]);
  }, []);

  return {
    waveformData,
    addMeteringValue,
    reset,
  };
}
