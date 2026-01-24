/**
 * Chat hook for managing conversation state and messages
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { GiftedChat } from 'react-native-gifted-chat';
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
  isStreaming: boolean;
  streamedText: string;
  sendMessage: (text: string) => Promise<void>;
  stopStreaming: () => void;
  conversationId: string | null;
}

export function useChat(conversationId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<GiftedMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationId);
  const [loading, setLoading] = useState(true);
  const [streamingMessage, setStreamingMessage] =
    useState<GiftedMessage | null>(null);

  const { isStreaming, startStreaming, stopStreaming, streamedText } =
    useStreamingResponse();

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
        setMessages(giftedMessages);
      } catch (error) {
        console.error('Failed to load conversation:', error);
      } finally {
        setLoading(false);
      }
    }

    loadConversation();
  }, [currentConversationId]);

  // Create or get conversation
  const ensureConversation = useCallback(async (): Promise<string> => {
    if (currentConversationId) return currentConversationId;

    const newConversation = await chatApi.createConversation();
    setCurrentConversationId(newConversation.id);
    return newConversation.id;
  }, [currentConversationId]);

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
      setMessages((prev) => GiftedChat.append(prev, [userMessage]));

      // Save user message to backend
      try {
        await chatApi.saveUserMessage(convId, text);
      } catch (error) {
        console.error('Failed to save user message:', error);
      }

      // Create placeholder AI message
      const aiMessageId = `ai-${Date.now()}`;
      setStreamingMessage({
        _id: aiMessageId,
        text: '',
        createdAt: new Date(),
        user: { _id: 'ai', name: 'AI 코치' },
      });

      try {
        // Start streaming
        await startStreaming(
          convId,
          text,
          (chunk) => {
            setStreamingMessage((prev) =>
              prev ? { ...prev, text: prev.text + chunk } : null
            );
          },
          async (finalText) => {
            setStreamingMessage(null);

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
            setMessages((prev) => GiftedChat.append(prev, [aiMessage]));
          }
        );
      } catch (error) {
        setStreamingMessage(null);
        // Show error in chat
        const errorMessage: GiftedMessage = {
          _id: `error-${Date.now()}`,
          text: '응답을 받는 중 오류가 발생했습니다. 다시 시도해주세요.',
          createdAt: new Date(),
          user: { _id: 'system', name: '시스템' },
        };
        setMessages((prev) => GiftedChat.append(prev, [errorMessage]));
      }
    },
    [ensureConversation, startStreaming]
  );

  // Combine messages with streaming message for display
  // Memoize to prevent infinite re-renders
  const displayMessages = useMemo(() => {
    if (streamingMessage) {
      return GiftedChat.append(messages, [streamingMessage]);
    }
    return messages;
  }, [messages, streamingMessage]);

  return {
    messages: displayMessages,
    loading,
    isStreaming,
    streamedText,
    sendMessage,
    stopStreaming,
    conversationId: currentConversationId,
  };
}
