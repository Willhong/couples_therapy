/**
 * Chat Screen component
 * Main chat interface using react-native-gifted-chat
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
import { ReframingData, GiftedMessage } from '../types';

// Stable references for GiftedChat props - prevents re-renders
const CURRENT_USER = { _id: 'user' } as const;
const LIST_VIEW_PROPS = {
  initialNumToRender: 20,
  maxToRenderPerBatch: 10,
  windowSize: 10,
} as const;
const BUBBLE_WRAPPER_STYLE = {
  left: { backgroundColor: '#F3F4F6' },
  right: { backgroundColor: '#6B7FD7' },
};
const BUBBLE_TEXT_STYLE = {
  left: { color: '#1F2937' },
  right: { color: '#FFFFFF' },
};

interface Props {
  conversationId?: string;
  onOpenReframing?: (reframingData: ReframingData, messageId: string) => void;
}

export function ChatScreen({
  conversationId,
  onOpenReframing,
}: Props): React.ReactElement {
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
    (props: BubbleProps<IMessage>) => {
      const currentMessage = props.currentMessage as GiftedMessage;
      const isAI = currentMessage?.user._id === 'ai';
      const hasReframing = currentMessage?.reframingData;

      return (
        <View>
          <Bubble
            {...props}
            wrapperStyle={BUBBLE_WRAPPER_STYLE}
            textStyle={BUBBLE_TEXT_STYLE}
          />
          {isAI && hasReframing && onOpenReframing && (
            <TouchableOpacity
              style={styles.viewReframingButton}
              onPress={() =>
                onOpenReframing(
                  currentMessage.reframingData!,
                  String(currentMessage._id)
                )
              }
            >
              <Text style={styles.viewReframingText}>관점 분석 보기</Text>
              <Ionicons name="chevron-forward" size={16} color="#6B7FD7" />
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [onOpenReframing]
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
        user={CURRENT_USER}
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
        listViewProps={LIST_VIEW_PROPS}
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
  viewReframingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  viewReframingText: {
    fontSize: 13,
    color: '#6B7FD7',
    fontWeight: '500',
  },
});
