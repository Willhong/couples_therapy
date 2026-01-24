/**
 * Chat hook for managing conversation state and messages
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { chatApi } from '../services/chatApi';
import { useStreamingResponse } from './useStreamingResponse';
import { Message, ReframingData, ChatMessage } from '../types';

/**
 * Convert backend message to ChatMessage format
 */
function toChatMessage(msg: Message): ChatMessage {
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
  messages: ChatMessage[];
  loading: boolean;
  isTyping: boolean;
  statusMessage: string;
  sendMessage: (text: string) => Promise<void>;
  stopStreaming: () => void;
  conversationId: string | null;
}

// Stable empty array reference to prevent re-renders
const EMPTY_MESSAGES: ChatMessage[] = [];

export function useChat(conversationId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(EMPTY_MESSAGES);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationId);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Use ref to track message updates without triggering re-renders
  const messagesRef = useRef<ChatMessage[]>(EMPTY_MESSAGES);

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
        const chatMessages = data.messages.map(toChatMessage).reverse();
        messagesRef.current = chatMessages;
        setMessages(chatMessages);
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
    setStatusMessage('');
  }, [stopStream]);

  // Create or get conversation
  const ensureConversation = useCallback(async (): Promise<string> => {
    if (currentConversationId) return currentConversationId;

    const newConversation = await chatApi.createConversation();
    setCurrentConversationId(newConversation.id);
    return newConversation.id;
  }, [currentConversationId]);

  // Helper to update messages without triggering infinite loops
  const addMessage = useCallback((message: ChatMessage) => {
    // Prepend message (newest first for inverted list)
    const newMessages = [message, ...messagesRef.current];
    messagesRef.current = newMessages;
    setMessages(newMessages);
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (text: string) => {
      const convId = await ensureConversation();

      // Add user message immediately (optimistic)
      const userMessage: ChatMessage = {
        _id: `user-${Date.now()}`,
        text,
        createdAt: new Date(),
        user: { _id: 'user' },
      };
      addMessage(userMessage);

      // Show typing indicator
      setIsTyping(true);
      setStatusMessage('처리 중...');

      try {
        // Start streaming with status updates
        const result = await startStreaming(
          convId,
          text,
          (status) => {
            // Update status message during streaming
            setStatusMessage(status);
          },
          async (streamResult) => {
            setIsTyping(false);
            setStatusMessage('');

            // Build reframing data from stream result
            const reframingData: ReframingData | undefined = streamResult.analysis
              ? {
                  analysis: streamResult.analysis,
                  suggestions: streamResult.suggestions || [],
                }
              : undefined;

            // Save to backend
            const savedMessage = await chatApi.saveReframing(
              convId,
              streamResult.finalResponse,
              reframingData || null
            );

            // Add final AI message
            const aiMessage = toChatMessage(savedMessage);
            addMessage(aiMessage);
          }
        );

        // If streaming completed without calling onComplete (edge case)
        if (result.finalResponse && isTyping) {
          setIsTyping(false);
          setStatusMessage('');
        }
      } catch (error) {
        setIsTyping(false);
        setStatusMessage('');
        console.error('Streaming error:', error);
        // Show error in chat
        const errorMessage: ChatMessage = {
          _id: `error-${Date.now()}`,
          text: '응답을 받는 중 오류가 발생했습니다. 다시 시도해주세요.',
          createdAt: new Date(),
          user: { _id: 'system', name: '시스템' },
        };
        addMessage(errorMessage);
      }
    },
    [ensureConversation, startStreaming, addMessage, isTyping]
  );

  return {
    messages,
    loading,
    isTyping,
    statusMessage,
    sendMessage,
    stopStreaming,
    conversationId: currentConversationId,
  };
}
