/**
 * Safety API service for abuse screening
 */
import { api } from '@/lib/api';
import { SafetyAssessment, SafetyAssessmentData, CrisisResources } from '../types';

export const safetyApi = {
  /**
   * Submit safety assessment
   */
  assessSafety: async (
    data: SafetyAssessmentData
  ): Promise<SafetyAssessment> => {
    const response = await api.post<SafetyAssessment>('/safety/assess/', data);
    return response.data;
  },

  /**
   * Get current safety status
   */
  getSafetyStatus: async (): Promise<SafetyAssessment> => {
    const response = await api.get<SafetyAssessment>('/safety/status/');
    return response.data;
  },

  /**
   * Get crisis resources
   */
  getCrisisResources: async (): Promise<CrisisResources> => {
    const response = await api.get<CrisisResources>('/safety/resources/');
    return response.data;
  },
};
