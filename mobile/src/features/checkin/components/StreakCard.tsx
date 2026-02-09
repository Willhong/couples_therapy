import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStreak, type Streak } from '../api';

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
        <Ionicons name="flame" size={24} color="#7C9082" />
        <View>
          <Text style={styles.count}>{streak.current_streak}일 연속</Text>
          <Text style={styles.label}>최고 기록: {streak.longest_streak}일</Text>
        </View>
      </View>
      <Ionicons name="heart" size={20} color="#C4A092" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8EFEA',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  count: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  label: {
    fontSize: 12,
    color: '#5A5A5A',
    marginTop: 2,
  },
});
