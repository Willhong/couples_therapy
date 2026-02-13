/**
 * Chat hook for managing conversation state and messages
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { chatApi } from '../services/chatApi';
import { useStreamingResponse } from './useStreamingResponse';
import { Message, ChatMessage } from '../types';

function toChatMessage(msg: Message): ChatMessage {
  return {
    _id: msg.id,
    text: msg.content,
    createdAt: new Date(msg.created_at),
    user: {
      _id: msg.role === 'user' ? 'user' : 'ai',
      name: msg.role === 'user' ? undefined : 'AI',
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

const EMPTY_MESSAGES: ChatMessage[] = [];

export function useChat(conversationId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(EMPTY_MESSAGES);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationId);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const messagesRef = useRef<ChatMessage[]>(EMPTY_MESSAGES);
  const { startStreaming, stopStreaming: stopStream } = useStreamingResponse();

  useEffect(() => {
    setCurrentConversationId((prev) => {
      if (prev === conversationId) {
        return prev;
      }
      return conversationId;
    });
  }, [conversationId]);

  useEffect(() => {
    let active = true;

    async function loadConversation() {
      if (!currentConversationId) {
        messagesRef.current = EMPTY_MESSAGES;
        if (active) {
          setMessages(EMPTY_MESSAGES);
          setLoading(false);
        }
        return;
      }

      try {
        if (active) {
          setLoading(true);
        }
        const data = await chatApi.getConversation(currentConversationId);
        const chatMessages = data.messages.map(toChatMessage).reverse();
        if (active) {
          messagesRef.current = chatMessages;
          setMessages(chatMessages);
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
        if (active) {
          messagesRef.current = EMPTY_MESSAGES;
          setMessages(EMPTY_MESSAGES);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadConversation();
    return () => {
      active = false;
    };
  }, [currentConversationId]);

  const stopStreaming = useCallback(() => {
    stopStream();
    setIsTyping(false);
    setStatusMessage('');
  }, [stopStream]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (currentConversationId) {
      return currentConversationId;
    }

    const newConversation = await chatApi.createConversation();
    setCurrentConversationId(newConversation.id);
    return newConversation.id;
  }, [currentConversationId]);

  const addMessage = useCallback((message: ChatMessage) => {
    const newMessages = [message, ...messagesRef.current];
    messagesRef.current = newMessages;
    setMessages(newMessages);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const convId = await ensureConversation();

      const userMessage: ChatMessage = {
        _id: `user-${Date.now()}`,
        text,
        createdAt: new Date(),
        user: { _id: 'user' },
      };
      addMessage(userMessage);

      setIsTyping(true);
      setStatusMessage('답변 생성 중');

      try {
        const result = await startStreaming(
          convId,
          text,
          (status) => {
            setStatusMessage(status);
          },
          (streamResult) => {
            setIsTyping(false);
            setStatusMessage('');

            const aiMessage: ChatMessage = {
              _id: streamResult.messageId || `ai-${Date.now()}`,
              text: streamResult.finalResponse,
              createdAt: new Date(),
              user: { _id: 'ai', name: 'AI' },
              reframingData: streamResult.analysis
                ? {
                    analysis: streamResult.analysis,
                    suggestions: streamResult.suggestions || [],
                    is_abuse_detected: false,
                  }
                : undefined,
              mode: streamResult.mode,
              crisisType: streamResult.crisisType,
            };
            addMessage(aiMessage);
          }
        );

        if (result.finalResponse && isTyping) {
          setIsTyping(false);
          setStatusMessage('');
        }
      } catch (error) {
        setIsTyping(false);
        setStatusMessage('');
        console.error('Reframe error:', error);

        messagesRef.current = messagesRef.current.filter(
          (m) => m._id !== userMessage._id
        );
        setMessages([...messagesRef.current]);

        const errorMessage: ChatMessage = {
          _id: `error-${Date.now()}`,
          text: '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          createdAt: new Date(),
          user: { _id: 'system', name: 'System' },
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
