/**
 * Message Bubble component
 * Individual message bubble with user vs AI styling
 * User messages on right (blue), AI messages on left (gray)
 */
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage, ReframingData } from '../types';

interface Props {
  message: ChatMessage;
  onOpenReframing?: (reframingData: ReframingData, messageId: string) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MessageBubbleComponent({ message, onOpenReframing }: Props): React.ReactElement {
  const isUser = message.user._id === 'user';
  const isSystem = message.user._id === 'system';
  const hasReframing = message.reframingData && !isUser;

  return (
    <View style={[styles.container, isUser ? styles.containerRight : styles.containerLeft]}>
      {/* Sender name for AI messages */}
      {!isUser && !isSystem && (
        <Text style={styles.senderName}>{message.user.name || 'AI 코치'}</Text>
      )}

      {/* Message bubble */}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : isSystem ? styles.bubbleSystem : styles.bubbleAI,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.textUser : isSystem ? styles.textSystem : styles.textAI,
          ]}
        >
          {message.text}
        </Text>
      </View>

      {/* Timestamp */}
      <Text style={[styles.timestamp, isUser ? styles.timestampRight : styles.timestampLeft]}>
        {formatTime(message.createdAt)}
      </Text>

      {/* Reframing button for AI messages with reframing data */}
      {hasReframing && onOpenReframing && (
        <TouchableOpacity
          style={styles.viewReframingButton}
          onPress={() => onOpenReframing(message.reframingData!, message._id)}
        >
          <Text style={styles.viewReframingText}>관점 분석 보기</Text>
          <Ionicons name="chevron-forward" size={16} color="#6B7FD7" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 12,
    maxWidth: '80%',
  },
  containerLeft: {
    alignSelf: 'flex-start',
  },
  containerRight: {
    alignSelf: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#6B7FD7',
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubbleSystem: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  textUser: {
    color: '#FFFFFF',
  },
  textAI: {
    color: '#1F2937',
  },
  textSystem: {
    color: '#92400E',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  timestampLeft: {
    marginLeft: 4,
  },
  timestampRight: {
    textAlign: 'right',
    marginRight: 4,
  },
  viewReframingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  viewReframingText: {
    fontSize: 13,
    color: '#6B7FD7',
    fontWeight: '500',
  },
});

// Memoize to prevent unnecessary re-renders in FlatList
export const MessageBubble = memo(MessageBubbleComponent);
