import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock } from 'lucide-react-native';
import { colors, alpha, headingFont } from '@/theme';
import type { Activity } from '../api';

interface Props {
  activity: {
    title: string;
    description: string;
    estimated_minutes: number;
    category?: string;
  };
  onPress?: () => void;
}

export function FeaturedActivityCard({ activity, onPress }: Props): React.ReactElement {
  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.imageArea} />
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>추천</Text>
        </View>
        <Text style={styles.title}>{activity.title}</Text>
        <Text style={styles.description}>{activity.description}</Text>
        <View style={styles.metaRow}>
          <Clock size={14} color={colors.white} strokeWidth={2} />
          <Text style={styles.durationText}>{activity.estimated_minutes}분</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    backgroundColor: '#C4A092',
    overflow: 'hidden',
  },
  imageArea: {
    height: 140,
    backgroundColor: '#B8968A',
  },
  content: {
    padding: 20,
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: alpha(colors.white, 0.2),
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  title: {
    fontFamily: headingFont,
    fontSize: 22,
    fontWeight: '500',
    color: colors.white,
  },
  description: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.9,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.7,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.white,
  },
});
