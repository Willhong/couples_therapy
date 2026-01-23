/**
 * useReframing hook
 * Manages reframing modal state
 */
import { useState, useCallback } from 'react';
import { ReframingData } from '@/features/chat/types';

interface CurrentReframing {
  data: ReframingData;
  messageId: string;
}

interface UseReframingReturn {
  currentReframing: CurrentReframing | null;
  openReframing: (data: ReframingData, messageId: string) => void;
  closeReframing: () => void;
  isVisible: boolean;
}

export function useReframing(): UseReframingReturn {
  const [currentReframing, setCurrentReframing] =
    useState<CurrentReframing | null>(null);

  const openReframing = useCallback(
    (data: ReframingData, messageId: string) => {
      setCurrentReframing({ data, messageId });
    },
    []
  );

  const closeReframing = useCallback(() => {
    setCurrentReframing(null);
  }, []);

  return {
    currentReframing,
    openReframing,
    closeReframing,
    isVisible: currentReframing !== null,
  };
}
