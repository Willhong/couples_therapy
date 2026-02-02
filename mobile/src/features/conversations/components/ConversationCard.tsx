/**
 * ConversationCard - single item in the unified conversation list.
 *
 * Shows a type icon, type badge in Korean, title, preview text,
 * relative date, and an optional emotion dot.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConversationEntry, ConversationType } from '../types';

interface ConversationCardProps {
  item: ConversationEntry;
  onPress: (item: ConversationEntry) => void;
}

/** Map conversation type to Ionicons name and color. */
const TYPE_CONFIG: Record<
  ConversationType,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  text: { icon: 'chatbubble', color: '#6B7FD7', bg: '#EEF0FB' },
  narration: { icon: 'mic', color: '#F59E0B', bg: '#FEF3C7' },
  live: { icon: 'radio', color: '#EF4444', bg: '#FEE2E2' },
};

/** Simple relative time formatter. */
function formatRelativeDate(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

/** Emotion intensity to color dot. */
function emotionColor(value: number | null): string | null {
  if (value === null) return null;
  if (value >= 7) return '#EF4444'; // high
  if (value >= 4) return '#F59E0B'; // medium
  return '#10B981'; // low
}

export function ConversationCard({
  item,
  onPress,
}: ConversationCardProps): React.ReactElement {
  const config = TYPE_CONFIG[item.type];

  const dotColor = emotionColor(item.emotion_indicator);

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(item)}
      android_ripple={{ color: '#E5E7EB' }}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title || '제목 없음'}
          </Text>
          <Text style={styles.date}>
            {formatRelativeDate(item.updated_at)}
          </Text>
        </View>

        <View style={styles.middleRow}>
          <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Text style={[styles.badgeText, { color: config.color }]}>
              {item.type_display}
            </Text>
          </View>
          {dotColor && (
            <View style={[styles.emotionDot, { backgroundColor: dotColor }]} />
          )}
        </View>

        {item.last_message_preview ? (
          <Text style={styles.preview} numberOfLines={2}>
            {item.last_message_preview}
          </Text>
        ) : item.summary ? (
          <Text style={styles.preview} numberOfLines={2}>
            {item.summary}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emotionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  preview: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
