/**
 * Daily prompts feature types
 */

export interface DailyPrompt {
  id: number;
  text_ko: string;
  category: 'daily' | 'dreams' | 'memories' | 'gratitude' | 'future' | 'deep';
  category_display: string;
  difficulty_level: 1 | 2 | 3;
}

export interface PromptResponse {
  id: number;
  user: number;
  user_email: string;
  response_text: string;
  created_at: string;
}

export interface DailyPromptAssignment {
  id: number;
  assigned_date: string;
  prompt: DailyPrompt;
  responses: PromptResponse[];
  response_count: number;
  both_responded: boolean;
}

export interface PromptResponseRequest {
  response_text: string;
}

export interface TopicLibraryResponse {
  [category: string]: DailyPrompt[];
}
