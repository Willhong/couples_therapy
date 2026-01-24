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

export interface ReframingData {
  acknowledgment: string;
  what_you_said: string;
  how_they_heard: string;
  how_you_heard_them?: string;
  why_the_gap: string;
  suggestions: string[];
  original_quotes: string[];
  abuse_flag?: boolean;
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
}
