import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Activity } from '../api';

const CATEGORY_ICONS: Record<string, string> = {
  conversation: 'chatbubble-ellipses-outline',
  game: 'game-controller-outline',
  exercise: 'fitness-outline',
  date: 'heart-outline',
};

const CATEGORY_COLORS: Record<string, string> = {
  conversation: '#E8EFEA',
  game: '#F5EBE7',
  exercise: '#E8EFEA',
  date: '#F5EBE7',
};

interface Props {
  activity: Activity;
  onPress: (activity: Activity) => void;
}

export function ActivityCard({ activity, onPress }: Props): React.ReactElement {
  const iconName = CATEGORY_ICONS[activity.category] || 'star-outline';
  const iconBg = CATEGORY_COLORS[activity.category] || '#E8EFEA';

  return (
    <Pressable style={styles.container} onPress={() => onPress(activity)}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName as any} size={20} color="#7C9082" />
      </View>
      <Text style={styles.title} numberOfLines={2}>{activity.title}</Text>
      <View style={styles.meta}>
        <Ionicons name="time-outline" size={12} color="#ADADAD" />
        <Text style={styles.metaText}>{activity.estimated_minutes}분</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E8E4DF',
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
    color: '#2D2D2D',
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#ADADAD',
  },
});
