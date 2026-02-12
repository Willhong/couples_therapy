import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';
import { usePartnerDashboard } from '../hooks/usePartnerDashboard';

const MOOD_EMOJI: Record<number, string> = {
  1: '\uD83D\uDE22',
  2: '\uD83D\uDE1F',
  3: '\uD83D\uDE10',
  4: '\uD83D\uDE42',
  5: '\uD83D\uDE0A',
};

function getMoodEmoji(avg: number | null | undefined): string {
  if (avg == null) return MOOD_EMOJI[3];
  const rounded = Math.round(avg);
  return MOOD_EMOJI[rounded] || MOOD_EMOJI[3];
}

function getDaysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function PartnerDashboardCard(): React.ReactElement | null {
  const { data, loading, error } = usePartnerDashboard();

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return null;
  }

  const { user_stats, partner_stats, connected_since } = data;
  const daysSince = getDaysSince(connected_since);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>커플 현황</Text>

      <View style={styles.columns}>
        {/* My stats */}
        <View style={styles.column}>
          <Text style={styles.columnLabel}>나</Text>
          <Text style={styles.moodEmoji}>{getMoodEmoji(user_stats.avg_mood)}</Text>
          <Text style={styles.moodValue}>{(user_stats.avg_mood ?? 0).toFixed(1)}</Text>
          <View style={styles.statRow}>
            <Text style={styles.statEmoji}>{'\uD83D\uDD25'}</Text>
            <Text style={styles.statText}>{user_stats.streak}일</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statEmoji}>{'\uD83D\uDCAC'}</Text>
            <Text style={styles.statText}>{user_stats.conversation_count}회</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Partner stats */}
        <View style={styles.column}>
          <Text style={styles.columnLabel}>{partner_stats.display_name}</Text>
          <Text style={styles.moodEmoji}>{getMoodEmoji(partner_stats.avg_mood)}</Text>
          <Text style={styles.moodValue}>{(partner_stats.avg_mood ?? 0).toFixed(1)}</Text>
          <View style={styles.statRow}>
            <Text style={styles.statEmoji}>{'\uD83D\uDD25'}</Text>
            <Text style={styles.statText}>{partner_stats.streak}일</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statEmoji}>{'\uD83D\uDCAC'}</Text>
            <Text style={styles.statText}>{partner_stats.conversation_count}회</Text>
          </View>
        </View>
      </View>

      <Text style={styles.connectedSince}>
        연결된 지 {daysSince}일째
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontFamily: headingFont,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  moodValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  statText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
    marginHorizontal: 12,
  },
  connectedSince: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
  },
});
