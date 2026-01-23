/**
 * Onboarding API service
 * Handles profile and goals submission to backend
 */

import { api } from '@/lib/api';
import type {
  UserProfile,
  UserGoals,
  OnboardingStatus,
} from '../types';

/**
 * Onboarding API endpoints
 */
export const onboardingApi = {
  /**
   * Get current onboarding status
   */
  getStatus: async (): Promise<OnboardingStatus> => {
    const response = await api.get('/onboarding/status/');
    return response.data;
  },

  /**
   * Save user profile (attachment and conflict styles)
   */
  saveProfile: async (profile: UserProfile): Promise<UserProfile> => {
    const response = await api.post('/onboarding/profile/', profile);
    return response.data;
  },

  /**
   * Update existing user profile
   */
  updateProfile: async (profile: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await api.put('/onboarding/profile/', profile);
    return response.data;
  },

  /**
   * Save user goals
   */
  saveGoals: async (goals: UserGoals): Promise<UserGoals> => {
    const response = await api.post('/onboarding/goals/', goals);
    return response.data;
  },

  /**
   * Update existing user goals
   */
  updateGoals: async (goals: Partial<UserGoals>): Promise<UserGoals> => {
    const response = await api.put('/onboarding/goals/', goals);
    return response.data;
  },
};
