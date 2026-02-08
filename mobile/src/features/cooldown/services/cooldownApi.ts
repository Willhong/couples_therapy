/**
 * Cool-down API service for managing de-escalation sessions
 */
import { api } from '@/lib/api';
import { CoolDown, CoolDownStartRequest } from '../types';

export const cooldownApi = {
  /**
   * Start a new cool-down session
   */
  startCooldown: async (
    duration_seconds: number = 600
  ): Promise<CoolDown> => {
    const response = await api.post<CoolDown>('/cooldown/start/', {
      duration_seconds,
    } as CoolDownStartRequest);
    return response.data;
  },

  /**
   * Get the current active cool-down session (if any)
   */
  getActiveCooldown: async (): Promise<CoolDown | null> => {
    try {
      const response = await api.get<CoolDown>('/cooldown/active/');
      return response.data;
    } catch (error: any) {
      // 404 means no active session
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Mark a cool-down session as completed
   */
  completeCooldown: async (cooldownId: string): Promise<CoolDown> => {
    const response = await api.post<CoolDown>(
      `/cooldown/${cooldownId}/complete/`
    );
    return response.data;
  },
};
