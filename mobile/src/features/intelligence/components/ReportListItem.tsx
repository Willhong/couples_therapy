import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';
import type { InsightReportSummary } from '../types';

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return `${Math.floor(diffDays / 30)}개월 전`;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  weekly: '주간',
  monthly: '월간',
  pattern: '패턴',
  accumulative: '누적',
};

interface ReportListItemProps {
  report: InsightReportSummary;
}

export function ReportListItem({ report }: ReportListItemProps): React.ReactElement {
  const router = useRouter();
  const isUnread = report.status === 'generated';
  const typeLabel = REPORT_TYPE_LABELS[report.report_type] || report.report_type;

  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: '/(main)/report/[id]',
          params: { id: String(report.id) },
        } as any)
      }
    >
      <View style={styles.topRow}>
        <View style={styles.leftRow}>
          {isUnread && <View style={styles.unreadDot} />}
          <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={1}>
            {report.title}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{typeLabel}</Text>
        </View>
      </View>
      <Text style={styles.preview} numberOfLines={2}>
        {report.preview}
      </Text>
      <Text style={styles.date}>{formatRelativeDate(report.created_at)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textPrimary,
    flex: 1,
  },
  titleUnread: {
    fontWeight: '700',
  },
  badge: {
    backgroundColor: colors.primaryBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  preview: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});
