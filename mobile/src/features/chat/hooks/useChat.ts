/**
 * Chat hook for managing conversation state and messages
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { chatApi } from '../services/chatApi';
import { useStreamingResponse } from './useStreamingResponse';
import { Message, ReframingData, GiftedMessage } from '../types';

/**
 * Parse JSON reframing data from AI response text
 */
function parseReframingResponse(text: string): ReframingData | null {
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      return JSON.parse(text.substring(jsonStart, jsonEnd));
    }
  } catch {
    // Not valid JSON - return null
  }
  return null;
}

/**
 * Convert backend message to GiftedChat message format
 */
function toGiftedMessage(msg: Message): GiftedMessage {
  return {
    _id: msg.id,
    text: msg.content,
    createdAt: new Date(msg.created_at),
    user: {
      _id: msg.role === 'user' ? 'user' : 'ai',
      name: msg.role === 'user' ? undefined : 'AI 코치',
    },
    reframingData: msg.reframing_data || undefined,
  };
}

interface UseChatReturn {
  messages: GiftedMessage[];
  loading: boolean;
  isTyping: boolean;
  sendMessage: (text: string) => Promise<void>;
  stopStreaming: () => void;
  conversationId: string | null;
}

// Stable empty array reference to prevent re-renders
const EMPTY_MESSAGES: GiftedMessage[] = [];

export function useChat(conversationId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<GiftedMessage[]>(EMPTY_MESSAGES);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationId);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  // Use ref to track message updates without triggering re-renders
  const messagesRef = useRef<GiftedMessage[]>(EMPTY_MESSAGES);

  const { startStreaming, stopStreaming: stopStream } = useStreamingResponse();

  // Load conversation history
  useEffect(() => {
    async function loadConversation() {
      if (!currentConversationId) {
        setLoading(false);
        return;
      }

      try {
        const data = await chatApi.getConversation(currentConversationId);
        const giftedMessages = data.messages.map(toGiftedMessage).reverse();
        messagesRef.current = giftedMessages;
        setMessages(giftedMessages);
      } catch (error) {
        console.error('Failed to load conversation:', error);
      } finally {
        setLoading(false);
      }
    }

    loadConversation();
  }, [currentConversationId]);

  // Stop streaming handler
  const stopStreaming = useCallback(() => {
    stopStream();
    setIsTyping(false);
  }, [stopStream]);

  // Create or get conversation
  const ensureConversation = useCallback(async (): Promise<string> => {
    if (currentConversationId) return currentConversationId;

    const newConversation = await chatApi.createConversation();
    setCurrentConversationId(newConversation.id);
    return newConversation.id;
  }, [currentConversationId]);

  // Helper to update messages without triggering infinite loops
  const addMessage = useCallback((message: GiftedMessage) => {
    // Prepend message (GiftedChat expects newest first)
    const newMessages = [message, ...messagesRef.current];
    messagesRef.current = newMessages;
    setMessages(newMessages);
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (text: string) => {
      const convId = await ensureConversation();

      // Add user message immediately (optimistic)
      const userMessage: GiftedMessage = {
        _id: `user-${Date.now()}`,
        text,
        createdAt: new Date(),
        user: { _id: 'user' },
      };
      addMessage(userMessage);

      // Save user message to backend
      try {
        await chatApi.saveUserMessage(convId, text);
      } catch (error) {
        console.error('Failed to save user message:', error);
      }

      // Show typing indicator
      setIsTyping(true);

      try {
        // Start streaming (we don't show intermediate text, just the final result)
        await startStreaming(
          convId,
          text,
          undefined, // No chunk callback - prevents re-renders during streaming
          async (finalText) => {
            setIsTyping(false);

            // Parse reframing data
            const reframingData = parseReframingResponse(finalText);

            // Save to backend
            const savedMessage = await chatApi.saveReframing(
              convId,
              finalText,
              reframingData
            );

            // Add final AI message
            const aiMessage = toGiftedMessage(savedMessage);
            addMessage(aiMessage);
          }
        );
      } catch (error) {
        setIsTyping(false);
        // Show error in chat
        const errorMessage: GiftedMessage = {
          _id: `error-${Date.now()}`,
          text: '응답을 받는 중 오류가 발생했습니다. 다시 시도해주세요.',
          createdAt: new Date(),
          user: { _id: 'system', name: '시스템' },
        };
        addMessage(errorMessage);
      }
    },
    [ensureConversation, startStreaming, addMessage]
  );

  return {
    messages,
    loading,
    isTyping,
    sendMessage,
    stopStreaming,
    conversationId: currentConversationId,
  };
}
