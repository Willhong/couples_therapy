/**
 * Message Bubble component
 * Individual message bubble with user vs AI styling
 * User messages on right (blue), AI messages on left (gray)
 * Long press to copy message text
 */
import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Sparkles } from 'lucide-react-native';
import { colors } from '@/theme';
import type { ChatMessage, ReframingData } from '../types';
import { CrisisResponseCard } from '@/features/safety';
import { InlineReframingCard } from './InlineReframingCard';

interface Props {
  message: ChatMessage;
  onOpenReframing?: (reframingData: ReframingData, messageId: string) => void;
  onShareWithPartner?: () => void;
  onSaveToJournal?: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MessageBubbleComponent({ message, onOpenReframing, onShareWithPartner, onSaveToJournal }: Props): React.ReactElement {
  const isUser = message.user._id === 'user';
  const isSystem = message.user._id === 'system';
  const isCrisis = message.mode === 'crisis';
  const hasReframing = message.reframingData && !isUser;

  const handleLongPress = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(message.text);
      Alert.alert('복사 완료', '메시지가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [message.text]);

  // Render crisis response card instead of normal bubble
  if (isCrisis && !isUser) {
    return (
      <View style={[styles.container, styles.containerLeft]}>
        <Text style={styles.senderName}>긴급 안전 지원</Text>
        <CrisisResponseCard crisisType={message.crisisType} message={message.text} />
        <Text style={[styles.timestamp, styles.timestampLeft]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isUser ? styles.containerRight : styles.containerLeft]}>
      {/* AI avatar + sender name */}
      {!isUser && !isSystem && (
        <View style={styles.aiHeader}>
          <View style={styles.aiAvatar}>
            <Sparkles size={16} color={colors.white} />
          </View>
          <Text style={styles.senderName}>{message.user.name || 'AI 코치'}</Text>
        </View>
      )}

      {/* Message bubble with long press */}
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [
          styles.bubble,
          isUser ? styles.bubbleUser : isSystem ? styles.bubbleSystem : styles.bubbleAI,
          pressed && styles.bubblePressed,
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
      </Pressable>

      {/* Timestamp */}
      <Text style={[styles.timestamp, isUser ? styles.timestampRight : styles.timestampLeft]}>
        {formatTime(message.createdAt)}
      </Text>

      {/* Inline reframing card for AI messages with reframing data */}
      {hasReframing && message.reframingData && (
        <InlineReframingCard
          reframingData={message.reframingData}
          onShareWithPartner={onShareWithPartner}
          onSaveToJournal={onSaveToJournal}
        />
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
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
    gap: 6,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleSystem: {
    backgroundColor: colors.warningBg,
    borderRadius: 12,
  },
  bubblePressed: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textUser: {
    color: colors.white,
  },
  textAI: {
    color: colors.textPrimary,
  },
  textSystem: {
    color: colors.warning,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
  },
  timestampLeft: {
    marginLeft: 4,
  },
  timestampRight: {
    textAlign: 'right',
    marginRight: 4,
  },
});

// Memoize to prevent unnecessary re-renders in FlatList
export const MessageBubble = memo(MessageBubbleComponent);
