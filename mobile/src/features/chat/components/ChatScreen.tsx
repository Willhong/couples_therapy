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
import { Ionicons } from '@expo/vector-icons';

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

  // Render typing indicator as list header (appears at bottom due to inverted list)
  const renderTypingIndicator = useCallback(() => {
    if (!isTyping) return null;

    return (
      <View style={styles.streamingFooter}>
        <AIThinkingIndicator statusMessage={statusMessage} />
        <TouchableOpacity style={styles.stopButton} onPress={stopStreaming}>
          <Ionicons name="stop-circle" size={24} color="#EF4444" />
          <Text style={styles.stopText}>중지</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isTyping, statusMessage, stopStreaming]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B7FD7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MessageList
        messages={messages as ChatMessage[]}
        onOpenReframing={onOpenReframing}
        ListHeaderComponent={renderTypingIndicator()}
      />

      {/* Suggestion chips above input when not typing */}
      {!isTyping && (
        <SuggestionChips onSelect={handleSuggestionSelect} />
      )}

      <ChatInput
        onSend={handleSend}
        disabled={isTyping}
        placeholder="갈등 상황을 설명해주세요..."
        value={inputText}
        onChangeText={handleInputChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#EF4444',
    marginLeft: 4,
    fontSize: 14,
  },
});
