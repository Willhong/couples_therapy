import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';

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

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>주간 인사이트</Text>
      <Pressable
        style={styles.card}
        onPress={() => router.push('/(main)/insights' as any)}
      >
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{summary.total_conversations}</Text>
            <Text style={styles.statLabel}>대화</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{summary.total_reframings}</Text>
            <Text style={styles.statLabel}>리프레이밍</Text>
          </View>
          {summary.avg_mood != null && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>{summary.avg_mood.toFixed(1)}</Text>
              <Text style={styles.statLabel}>평균 기분</Text>
            </View>
          )}
        </View>
        <View style={styles.viewBtn}>
          <Text style={styles.viewBtnText}>자세히 보기</Text>
          <Ionicons name="arrow-forward" size={16} color="#7C9082" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  card: {
    backgroundColor: '#7C9082',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  viewBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7C9082',
  },
});
