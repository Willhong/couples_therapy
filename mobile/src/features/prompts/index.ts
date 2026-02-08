/**
 * Daily prompts feature exports
 */
export { DailyPromptCard } from './components/DailyPromptCard';
export { PromptHistory } from './components/PromptHistory';
export { useDailyPrompt } from './hooks/useDailyPrompt';
export { promptsApi } from './services/promptsApi';
export type {
  DailyPrompt,
  PromptResponse,
  DailyPromptAssignment,
  PromptResponseRequest,
} from './types';
