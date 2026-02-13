import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight, MessageCircle, Gamepad2, Dumbbell, Heart, Star } from 'lucide-react-native';
import { colors } from '@/theme';
import type { Activity } from '../api';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth?: number }>> = {
  conversation: MessageCircle,
  game: Gamepad2,
  exercise: Dumbbell,
  date: Heart,
};

const ICON_BG_COLORS = ['#E8EFEA', '#F5EBE7'] as const;

interface Props {
  activity: Activity;
  index?: number;
  onPress?: (activity: Activity) => void;
}

export function ActivityListItem({ activity, index = 0, onPress }: Props): React.ReactElement {
  const IconComp = CATEGORY_ICONS[activity.category] || Star;
  const iconBg = ICON_BG_COLORS[index % 2];

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressedOpacity70]}
      onPress={() => onPress?.(activity)}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <IconComp size={20} color={colors.primary} strokeWidth={2} />
      </View>
      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>{activity.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{activity.description}</Text>
      </View>
      <Text style={styles.duration}>{activity.estimated_minutes}분</Text>
      <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E4DF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2D2D2D',
  },
  subtitle: {
    fontSize: 13,
    color: '#8A8A8A',
  },
  duration: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  pressedOpacity70: {
    opacity: 0.7,
  },
});
