/**
 * WeeklySummaryCard component
 * Shows a weekly summary: date range, session count, trend indicator,
 * AI-generated trend text, and top trigger phrases.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, alpha } from '@/theme';
import type { WeeklySummaryData } from '../types';

interface Props {
  summary: WeeklySummaryData;
}

const TREND_CONFIG = {
  improving: { label: '개선 중', color: colors.success, icon: '\u2193' },
  stable: { label: '유지 중', color: colors.warningAmber, icon: '\u2192' },
  worsening: { label: '주의 필요', color: colors.error, icon: '\u2191' },
} as const;

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sMonth = s.getMonth() + 1;
  const sDay = s.getDate();
  const eMonth = e.getMonth() + 1;
  const eDay = e.getDate();
  return `${sMonth}/${sDay} ~ ${eMonth}/${eDay}`;
}

export function WeeklySummaryCard({ summary }: Props): React.ReactElement {
  const trend = TREND_CONFIG[summary.escalation_trend] || TREND_CONFIG.stable;

  // Top trigger phrases from frequency map
  const topTriggers = Object.entries(summary.trigger_frequency || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3);

  return (
    <View style={styles.card}>
      {/* Header row: date range + trend badge */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateRange}>
            {formatDateRange(summary.period_start, summary.period_end)}
          </Text>
          <Text style={styles.sessionCount}>
            {summary.session_count}회 세션
          </Text>
        </View>
        <View style={[styles.trendBadge, { backgroundColor: trend.color + '1A' }]}>
          <Text style={[styles.trendIcon, { color: trend.color }]}>
            {trend.icon}
          </Text>
          <Text style={[styles.trendLabel, { color: trend.color }]}>
            {trend.label}
          </Text>
        </View>
      </View>

      {/* AI trend text */}
      {summary.trend_text && (
        <Text style={styles.trendText}>{summary.trend_text}</Text>
      )}

      {/* Top triggers */}
      {topTriggers.length > 0 && (
        <View style={styles.triggersSection}>
          <Text style={styles.triggersSectionTitle}>주요 트리거 표현</Text>
          <View style={styles.triggersList}>
            {topTriggers.map(([phrase, count]) => (
              <View key={phrase} style={styles.triggerChip}>
                <Text style={styles.triggerChipText}>
                  {phrase} ({count as number})
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateRange: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray800,
  },
  sessionCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  trendIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  trendLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.gray700,
    marginBottom: 12,
  },
  triggersSection: {
    borderTopWidth: 1,
    borderTopColor: colors.bgAiMessage,
    paddingTop: 12,
  },
  triggersSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  triggersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  triggerChip: {
    backgroundColor: alpha(colors.warningAmber, 0.1),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  triggerChipText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
  },
});
