import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MoodSelector } from './MoodSelector';
import { getTodayCheckIn, submitCheckIn, type CheckIn } from '../api';
import { colors } from '@/theme';

interface Props {
  onCheckInComplete?: () => void;
}

export function CheckInSection({ onCheckInComplete }: Props): React.ReactElement | null {
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null | undefined>(undefined);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getTodayCheckIn()
      .then(setTodayCheckIn)
      .catch(() => setTodayCheckIn(null));
  }, []);

  const handleSelect = useCallback(async (mood: number) => {
    setSelectedMood(mood);
    setSubmitting(true);
    try {
      const result = await submitCheckIn(mood);
      setTodayCheckIn(result);
      onCheckInComplete?.();
    } catch {
      // Reset on failure
      setSelectedMood(null);
    } finally {
      setSubmitting(false);
    }
  }, [onCheckInComplete]);

  // Still loading
  if (todayCheckIn === undefined) return null;

  // Already checked in today
  if (todayCheckIn) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>오늘의 체크인</Text>
          <Text style={styles.badge}>완료</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.completedText}>
            오늘의 기분: {todayCheckIn.mood_display}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>오늘의 체크인</Text>
        <Text style={styles.time}>오늘 예정</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.question}>오늘 관계에 대해 어떻게 느끼시나요?</Text>
        {submitting ? (
          <ActivityIndicator size="small" color={colors.accentSage} style={{ marginTop: 16 }} />
        ) : (
          <MoodSelector
            selected={selectedMood}
            onSelect={handleSelect}
            disabled={submitting}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  time: {
    fontSize: 12,
    color: colors.accentWarm,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentSage,
    backgroundColor: colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  question: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  completedText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
