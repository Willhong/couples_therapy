import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Lightbulb, Sparkles } from 'lucide-react-native';
import { colors } from '@/theme';
import type { Recommendation } from '../types';

const PRIORITY_CONFIG: Record<Recommendation['priority'], { label: string; color: string; bg: string }> = {
  high: { label: '높음', color: colors.error, bg: colors.errorBg },
  medium: { label: '보통', color: colors.warningDark, bg: colors.warningBg },
  low: { label: '낮음', color: colors.primary, bg: colors.primaryBg },
};

interface Props {
  recommendation: Recommendation;
  onPress: (recommendation: Recommendation) => void;
}

export function RecommendationCard({ recommendation, onPress }: Props): React.ReactElement {
  const Icon = recommendation.priority === 'high' ? Lightbulb : Sparkles;
  const priority = PRIORITY_CONFIG[recommendation.priority];

  return (
    <Pressable style={styles.container} onPress={() => onPress(recommendation)}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon size={18} color={priority.color} />
        </View>
        <View style={[styles.badge, { backgroundColor: priority.bg }]}>
          <Text style={[styles.badgeText, { color: priority.color }]}>{priority.label}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{recommendation.title}</Text>
      <Text style={styles.reason} numberOfLines={2}>{recommendation.reason}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bgPage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  reason: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
