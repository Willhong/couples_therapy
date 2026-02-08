/**
 * Chat feature type definitions
 */

export interface Conversation {
  id: string;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  has_reframing: boolean;
  reframing_data: ReframingData | null;
  created_at: string;
}

/**
 * Analysis data from AI reframing pipeline
 */
export interface ReframingAnalysis {
  what_you_said?: string;
  how_they_heard?: string;
  how_you_heard_them?: string;
  why_the_gap?: string;
  original_quotes?: string[];
}

/**
 * Complete reframing data structure
 */
export interface ReframingData {
  analysis?: ReframingAnalysis;
  suggestions?: string[];
  is_abuse_detected?: boolean;
}

export interface GiftedMessage {
  _id: string;
  text: string;
  createdAt: Date;
  user: {
    _id: string;
    name?: string;
  };
  reframingData?: ReframingData;
}

/**
 * ChatMessage type for custom chat UI
 * Simplified and cleaner than GiftedMessage
 */
export interface ChatMessage {
  _id: string;
  text: string;
  createdAt: Date;
  user: {
    _id: 'user' | 'ai' | 'system';
    name?: string;
  };
  reframingData?: ReframingData;
  mode?: 'chat' | 'reframing' | 'comfort' | 'crisis';
  crisisType?: string;
}
