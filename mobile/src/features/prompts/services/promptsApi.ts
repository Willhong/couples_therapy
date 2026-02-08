/**
 * Prompts API service for daily conversation prompts
 */
import { api } from '@/lib/api';
import { DailyPromptAssignment, PromptResponseRequest, TopicLibraryResponse } from '../types';

export const promptsApi = {
  /**
   * Get today's prompt for the user's couple (auto-assigns if none)
   */
  getTodayPrompt: async (): Promise<DailyPromptAssignment> => {
    const response = await api.get<DailyPromptAssignment>('/prompts/today/');
    return response.data;
  },

  /**
   * Submit response to today's prompt
   */
  respondToPrompt: async (
    responseText: string
  ): Promise<DailyPromptAssignment> => {
    const response = await api.post<DailyPromptAssignment>(
      '/prompts/respond/',
      {
        response_text: responseText,
      } as PromptResponseRequest
    );
    return response.data;
  },

  /**
   * Get both responses (only if BOTH partners responded)
   */
  revealResponses: async (): Promise<DailyPromptAssignment> => {
    const response = await api.get<DailyPromptAssignment>('/prompts/reveal/');
    return response.data;
  },

  /**
   * Get past prompt exchanges (where both partners responded)
   */
  getPromptHistory: async (): Promise<DailyPromptAssignment[]> => {
    const response = await api.get<DailyPromptAssignment[]>(
      '/prompts/history/'
    );
    return response.data;
  },

  /**
   * Get topic library (all prompts grouped by category)
   */
  getTopicLibrary: async (category?: string): Promise<TopicLibraryResponse> => {
    const params = category ? `?category=${category}` : '';
    const response = await api.get<TopicLibraryResponse>(`/prompts/library/${params}`);
    return response.data;
  },
};
