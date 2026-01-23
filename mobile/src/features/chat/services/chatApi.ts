/**
 * Chat API service for conversation and message management
 */
import { api } from '@/lib/api';
import { Conversation, Message, ReframingData } from '../types';

export const chatApi = {
  /**
   * Get all conversations for the current user
   */
  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get('/chat/conversations/');
    return response.data;
  },

  /**
   * Get a single conversation with its messages
   */
  getConversation: async (
    id: string
  ): Promise<Conversation & { messages: Message[] }> => {
    const response = await api.get(`/chat/conversations/${id}/`);
    return response.data;
  },

  /**
   * Create a new conversation
   */
  createConversation: async (): Promise<Conversation> => {
    const response = await api.post('/chat/conversations/', {});
    return response.data;
  },

  /**
   * Save a user message to the conversation
   */
  saveUserMessage: async (
    conversationId: string,
    content: string
  ): Promise<Message> => {
    const response = await api.post(
      `/chat/conversations/${conversationId}/messages/`,
      { content, role: 'user' }
    );
    return response.data;
  },

  /**
   * Save an AI reframing response to the conversation
   */
  saveReframing: async (
    conversationId: string,
    content: string,
    reframingData: ReframingData | null
  ): Promise<Message> => {
    const response = await api.post('/chat/save-reframing/', {
      conversation_id: conversationId,
      content,
      reframing_data: reframingData,
    });
    return response.data;
  },

  /**
   * Get messages for a conversation with pagination
   */
  getMessages: async (
    conversationId: string,
    cursor?: string
  ): Promise<{ messages: Message[]; next_cursor: string | null }> => {
    const url = cursor
      ? `/chat/conversations/${conversationId}/messages/?cursor=${cursor}`
      : `/chat/conversations/${conversationId}/messages/`;
    const response = await api.get(url);
    return response.data;
  },
};
