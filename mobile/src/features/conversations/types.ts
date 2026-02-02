/**
 * Unified conversation list type definitions.
 *
 * Represents text chats, narration recordings, and live recordings
 * in a single chronological list.
 */

export type ConversationType = 'text' | 'narration' | 'live';

export interface ConversationEntry {
  id: string;
  type: ConversationType;
  type_display: string;
  title: string;
  summary: string;
  emotion_indicator: number | null;
  created_at: string;
  updated_at: string;
  last_message_preview: string;
  message_count: number;
  recording_id: string | null;
  post_action: 'reframe' | 'comfort' | 'keep' | null;
}

export interface ConversationListResponse {
  results: ConversationEntry[];
  count: number;
  next: number | null;
  previous: number | null;
}
