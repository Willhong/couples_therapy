import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { api } from '@/lib/api';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

interface WeeklySummary {
  total_conversations: number;
  total_reframings: number;
  avg_mood?: number;
}

export function InsightsPreviewCard(): React.ReactElement | null {
  const router = useRouter();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  useEffect(() => {
    api.get<WeeklySummary>('/patterns/weekly-summary/')
      .then((res) => setSummary(res.data))
      .catch(() => {}); // Silently fail
  }, []);

  if (!summary) return null;

  // Generate insight message based on data
  const mainText = '소통이 개선되었어요';
  const subText = `이번 주 의미있는 대화가 ${summary.total_conversations}회 있었어요!`;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push('/(main)/insights' as any)}
    >
      <View style={styles.content}>
        <View style={styles.textGroup}>
          <Text style={styles.mainText}>{mainText}</Text>
          <Text style={styles.subText}>{subText}</Text>
        </View>
        <ChevronRight size={24} color={colors.white} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textGroup: {
    flex: 1,
    gap: 4,
  },
  mainText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: headingFont,
    color: colors.white,
  },
  subText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.white,
    opacity: 0.9,
  },
});
