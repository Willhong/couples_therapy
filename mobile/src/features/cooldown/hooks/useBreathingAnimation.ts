/**
 * Hook for breathing animation (4-4-4 pattern)
 */
import { useState, useEffect, useCallback } from 'react';
import { useSharedValue, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import { BreathingPhase } from '../types';

const INHALE_DURATION = 4000; // 4 seconds
const HOLD_DURATION = 4000; // 4 seconds
const EXHALE_DURATION = 4000; // 4 seconds
const CYCLE_DURATION = INHALE_DURATION + HOLD_DURATION + EXHALE_DURATION;

export function useBreathingAnimation() {
  const [phase, setPhase] = useState<BreathingPhase>('inhale');
  const scale = useSharedValue(0.6);

  // Get instruction text for current phase
  const getInstruction = useCallback((): string => {
    switch (phase) {
      case 'inhale':
        return '들이쉬세요';
      case 'hold':
        return '멈추세요';
      case 'exhale':
        return '내쉬세요';
    }
  }, [phase]);

  useEffect(() => {
    // Start breathing animation cycle
    scale.value = withRepeat(
      withTiming(1, {
        duration: INHALE_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite repeat
      false
    );

    // Update phase text every 4 seconds
    const phaseInterval = setInterval(() => {
      setPhase((current) => {
        if (current === 'inhale') return 'hold';
        if (current === 'hold') return 'exhale';
        return 'inhale';
      });
    }, 4000);

    return () => {
      clearInterval(phaseInterval);
    };
  }, []);

  return {
    phase,
    scale,
    instruction: getInstruction(),
  };
}
