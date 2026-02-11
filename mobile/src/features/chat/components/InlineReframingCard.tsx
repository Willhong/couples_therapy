/**
 * Inline Reframing Card component
 * Displays reframing suggestions inline within the chat bubble
 * with action chips for sharing and saving
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import type { ReframingData } from '../types';

interface Props {
  reframingData: ReframingData;
  onShareWithPartner?: () => void;
  onSaveToJournal?: () => void;
}

export function InlineReframingCard({
  reframingData,
  onShareWithPartner,
  onSaveToJournal,
}: Props): React.ReactElement {
  // Use first suggestion as the reframed perspective text
  const reframedText =
    reframingData.suggestions?.[0] ||
    reframingData.analysis?.why_the_gap ||
    '';

  if (!reframedText) return <></>;

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <Text style={styles.label}>새로운 관점</Text>
        <Text style={styles.quoteText}>{reframedText}</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionChip}
          onPress={onShareWithPartner}
          activeOpacity={0.7}
        >
          <Text style={styles.actionChipText}>파트너와 공유</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionChip}
          onPress={onSaveToJournal}
          activeOpacity={0.7}
        >
          <Text style={styles.actionChipText}>일기에 저장</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    gap: 8,
  },
  card: {
    backgroundColor: '#E8EFEA',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#7C9082',
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#2D2D2D',
    lineHeight: 21,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionChip: {
    backgroundColor: '#F5F3EF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionChipText: {
    fontSize: 12,
    color: '#5A5A5A',
  },
});
