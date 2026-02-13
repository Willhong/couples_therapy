/**
 * Suggestion chips component
 * Displays quick action buttons for voice input and topic recommendations
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Mic, Lightbulb } from 'lucide-react-native';
import { colors } from '@/theme';

interface Props {
  onSelect: (text: string) => void;
  onVoicePress?: () => void;
  onTopicRecommendPress?: () => void;
}

export function SuggestionChips({
  onSelect,
  onVoicePress,
  onTopicRecommendPress,
}: Props): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          onPress={onVoicePress}
        >
          <Mic size={14} color="#5A5A5A" />
          <Text style={styles.actionText}>음성</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          onPress={onTopicRecommendPress}
        >
          <Lightbulb size={14} color="#5A5A5A" />
          <Text style={styles.actionText}>주제 추천</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgPage,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3EF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: '#5A5A5A',
  },
});

