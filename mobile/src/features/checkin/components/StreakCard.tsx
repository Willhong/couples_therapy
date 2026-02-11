import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Heart } from 'lucide-react-native';
import { getStreak, type Streak } from '../api';
import { colors } from '@/theme';

export function StreakCard(): React.ReactElement | null {
  const [streak, setStreak] = useState<Streak | null>(null);

  useEffect(() => {
    getStreak()
      .then(setStreak)
      .catch(() => {}); // Silently fail
  }, []);

  if (!streak) return null;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Flame size={24} color={colors.accentSage} />
        <View>
          <Text style={styles.label}>연결 연속기록</Text>
          <Text style={styles.count}>함께한 {streak.current_streak}일</Text>
        </View>
      </View>
      <Heart size={20} color={colors.accentWarm} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  count: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
