import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';
import type { InsightReportDetail } from '../types';

const REPORT_TYPE_LABELS: Record<string, string> = {
  weekly: '주간',
  monthly: '월간',
  pattern: '패턴',
  accumulative: '누적',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}년 ${m}월 ${d}일`;
}

interface ReportDetailViewProps {
  report: InsightReportDetail;
}

export function ReportDetailView({ report }: ReportDetailViewProps): React.ReactElement {
  const router = useRouter();
  const typeLabel = REPORT_TYPE_LABELS[report.report_type] || report.report_type;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{typeLabel} 리포트</Text>
          </View>
          <Text style={styles.date}>{formatDate(report.created_at)}</Text>
        </View>
        <Text style={styles.title}>{report.title}</Text>
      </View>

      {/* Full Text */}
      {report.full_text ? (
        <View style={styles.section}>
          <Text style={styles.fullText}>{report.full_text}</Text>
        </View>
      ) : null}

      {/* Insights */}
      {report.insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주요 인사이트</Text>
          <View style={styles.card}>
            {report.insights.map((insight, index) => (
              <View key={index} style={styles.bulletRow}>
                <Text style={styles.bullet}>{'•'}</Text>
                <Text style={styles.bulletText}>{insight}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recommended Actions */}
      {report.recommended_actions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>추천 행동</Text>
          <View style={styles.card}>
            {report.recommended_actions.map((action, index) => (
              <View key={index} style={styles.numberedRow}>
                <Text style={styles.number}>{index + 1}.</Text>
                <Text style={styles.numberedText}>{action}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recommended Activities */}
      {report.recommended_activities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>추천 활동</Text>
          {report.recommended_activities.map((activity) => (
            <Pressable
              key={activity.id}
              style={styles.activityCard}
              onPress={() =>
                router.push({
                  pathname: '/(main)/activities',
                } as any)
              }
            >
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityReason}>{activity.reason}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: colors.primaryBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  date: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  title: {
    fontFamily: headingFont,
    fontSize: 24,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 32,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: headingFont,
    fontSize: 18,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  fullText: {
    fontSize: 15,
    color: colors.gray700,
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  bullet: {
    fontSize: 15,
    color: colors.primary,
    marginRight: 8,
    lineHeight: 22,
  },
  bulletText: {
    fontSize: 15,
    color: colors.gray700,
    lineHeight: 22,
    flex: 1,
  },
  numberedRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  number: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 8,
    lineHeight: 22,
  },
  numberedText: {
    fontSize: 15,
    color: colors.gray700,
    lineHeight: 22,
    flex: 1,
  },
  activityCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  activityReason: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
