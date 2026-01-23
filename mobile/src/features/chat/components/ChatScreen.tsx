/**
 * Chat Screen component
 * Main chat interface using react-native-gifted-chat
 * Note: "관점 분석 보기" button will be added in 02-05
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import {
  GiftedChat,
  Bubble,
  InputToolbar,
  Send,
  IMessage,
  BubbleProps,
  InputToolbarProps,
  SendProps,
} from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';

import { useChat } from '../hooks/useChat';
import { SuggestionChips } from './SuggestionChips';
import { AIThinkingIndicator } from './AIThinkingIndicator';

interface Props {
  conversationId?: string;
}

export function ChatScreen({ conversationId }: Props): React.ReactElement {
  const [inputText, setInputText] = useState('');
  const { messages, loading, isStreaming, sendMessage, stopStreaming } =
    useChat(conversationId || null);

  const onSend = useCallback(
    (newMessages: IMessage[] = []) => {
      if (newMessages.length > 0) {
        sendMessage(newMessages[0].text);
      }
    },
    [sendMessage]
  );

  const handleSuggestionSelect = useCallback((text: string) => {
    setInputText((prev) => prev + text);
  }, []);

  const renderBubble = useCallback(
    (props: BubbleProps<IMessage>) => (
      <Bubble
        {...props}
        wrapperStyle={{
          left: { backgroundColor: '#F3F4F6' },
          right: { backgroundColor: '#6B7FD7' },
        }}
        textStyle={{
          left: { color: '#1F2937' },
          right: { color: '#FFFFFF' },
        }}
      />
    ),
    []
  );

  const renderFooter = useCallback(() => {
    if (isStreaming) {
      return (
        <View style={styles.streamingFooter}>
          <AIThinkingIndicator />
          <TouchableOpacity style={styles.stopButton} onPress={stopStreaming}>
            <Ionicons name="stop-circle" size={24} color="#EF4444" />
            <Text style={styles.stopText}>중지</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  }, [isStreaming, stopStreaming]);

  const renderInputToolbar = useCallback(
    (props: InputToolbarProps<IMessage>) => (
      <View>
        {!isStreaming && (
          <SuggestionChips onSelect={handleSuggestionSelect} />
        )}
        <InputToolbar {...props} containerStyle={styles.inputToolbar} />
      </View>
    ),
    [isStreaming, handleSuggestionSelect]
  );

  const renderSend = useCallback(
    (props: SendProps<IMessage>) => (
      <Send {...props} disabled={isStreaming}>
        <View style={styles.sendButton}>
          <Ionicons
            name="send"
            size={24}
            color={isStreaming ? '#D1D5DB' : '#6B7FD7'}
          />
        </View>
      </Send>
    ),
    [isStreaming]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B7FD7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GiftedChat
        messages={messages as IMessage[]}
        onSend={onSend}
        user={{ _id: 'user' }}
        text={inputText}
        onInputTextChanged={setInputText}
        placeholder="갈등 상황을 설명해주세요..."
        renderBubble={renderBubble}
        renderFooter={renderFooter}
        renderInputToolbar={renderInputToolbar}
        renderSend={renderSend}
        locale="ko"
        inverted={true}
        alwaysShowSend
        listViewProps={
          {
            initialNumToRender: 20,
            maxToRenderPerBatch: 10,
            windowSize: 10,
          } as Record<string, unknown>
        }
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
  inputToolbar: {
    borderTopColor: '#E5E7EB',
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 5,
  },
  streamingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
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
