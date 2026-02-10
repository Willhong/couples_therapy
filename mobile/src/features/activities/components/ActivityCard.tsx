import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MessageCircle, Gamepad2, Dumbbell, Heart, Star, Clock } from 'lucide-react-native';
import type { Activity } from '../api';
import { colors } from '@/theme';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  conversation: MessageCircle,
  game: Gamepad2,
  exercise: Dumbbell,
  date: Heart,
};

const CATEGORY_COLORS: Record<string, string> = {
  conversation: colors.successBg,
  game: colors.primaryLight,
  exercise: colors.successBg,
  date: colors.primaryLight,
};

interface Props {
  activity: Activity;
  onPress: (activity: Activity) => void;
}

export function ActivityCard({ activity, onPress }: Props): React.ReactElement {
  const IconComp = CATEGORY_ICONS[activity.category] || Star;
  const iconBg = CATEGORY_COLORS[activity.category] || colors.successBg;

  return (
    <Pressable style={styles.container} onPress={() => onPress(activity)}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <IconComp size={20} color={colors.accentSage} />
      </View>
      <Text style={styles.title} numberOfLines={2}>{activity.title}</Text>
      <View style={styles.meta}>
        <Clock size={12} color={colors.textTertiary} />
        <Text style={styles.metaText}>{activity.estimated_minutes}분</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    width: 140,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});
