/**
 * Chat Screen component
 * Main chat interface using custom components
 * Includes "관점 분석 보기" button on AI messages with reframing data
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, EllipsisVertical, StopCircle } from 'lucide-react-native';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

import { useChat } from '../hooks/useChat';
import { SuggestionChips } from './SuggestionChips';
import { AIThinkingIndicator } from './AIThinkingIndicator';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { ReframingData, ChatMessage } from '../types';

interface Props {
  conversationId?: string;
  onOpenReframing?: (reframingData: ReframingData, messageId: string) => void;
  onSendMessageReady?: (sendMessage: (text: string) => Promise<void>) => void;
}

export function ChatScreen({
  conversationId,
  onOpenReframing,
  onSendMessageReady,
}: Props): React.ReactElement {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const { messages, loading, isTyping, statusMessage, sendMessage, stopStreaming } =
    useChat(conversationId || null);

  // Provide sendMessage function to parent component
  React.useEffect(() => {
    if (onSendMessageReady) {
      onSendMessageReady(sendMessage);
    }
  }, [sendMessage, onSendMessageReady]);

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(text);
      setInputText(''); // Clear after sending
    },
    [sendMessage]
  );

  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
  }, []);

  const handleSuggestionSelect = useCallback((text: string) => {
    setInputText((prev) => prev + text);
  }, []);

  const handleVoicePress = useCallback(() => {
    router.push('/(main)/record' as any);
  }, [router]);

  const handleTopicRecommendPress = useCallback(() => {
    const topics = [
      '오늘 있었던 좋은 일 나누기',
      '서로에게 고마운 점 이야기하기',
      '이번 주 함께 하고 싶은 활동',
      '최근 스트레스 받는 일 공유하기',
    ];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    setInputText(randomTopic);
  }, []);

  // Render typing indicator as list header (appears at bottom due to inverted list)
  const renderTypingIndicator = useCallback(() => {
    if (!isTyping) return null;

    return (
      <View style={styles.streamingFooter}>
        <AIThinkingIndicator statusMessage={statusMessage} />
        <TouchableOpacity style={styles.stopButton} onPress={stopStreaming}>
          <StopCircle size={24} color={colors.error} />
          <Text style={styles.stopText}>중지</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isTyping, statusMessage, stopStreaming]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>함께 리프레이밍</Text>
        <TouchableOpacity style={styles.headerButton}>
          <EllipsisVertical size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <MessageList
        messages={messages as ChatMessage[]}
        onOpenReframing={onOpenReframing}
        ListHeaderComponent={renderTypingIndicator()}
      />

      {/* Quick action chips above input when not typing */}
      {!isTyping && (
        <SuggestionChips
          onSelect={handleSuggestionSelect}
          onVoicePress={handleVoicePress}
          onTopicRecommendPress={handleTopicRecommendPress}
        />
      )}

      <ChatInput
        onSend={handleSend}
        disabled={isTyping}
        placeholder="생각을 적어보세요..."
        value={inputText}
        onChangeText={handleInputChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgPage,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: headingFont,
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streamingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
    marginBottom: 8,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  stopText: {
    color: colors.error,
    marginLeft: 4,
    fontSize: 14,
  },
});
