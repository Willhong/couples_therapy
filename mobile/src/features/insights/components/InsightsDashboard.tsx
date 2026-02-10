/**
 * InsightsDashboard component
 * Main insights screen: stats row, weekly summary, charts, triggers, topics.
 * Neutral observational tone throughout.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';
import { useDashboard, useWeeklySummaries } from '../hooks/useInsights';
import { WeeklySummaryCard } from './WeeklySummaryCard';
import {
  ConflictFrequencyChart,
  TopicDistributionChart,
  EscalationTrendChart,
} from './PatternChart';
import { TriggerHighlight } from './TriggerHighlight';

export function InsightsDashboard(): React.ReactElement {
  const { data: dashboard, loading, error, refetch } = useDashboard();
  const { data: weeklySummaries } = useWeeklySummaries();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Loading state
  if (loading && !dashboard) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>인사이트를 불러오는 중...</Text>
      </View>
    );
  }

  // Error state
  if (error && !dashboard) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Empty state
  if (!dashboard || dashboard.total_sessions === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>아직 분석할 데이터가 없어요</Text>
        <Text style={styles.emptyDescription}>
          대화나 녹음을 시작하면 패턴 분석 결과가 여기에 표시됩니다
        </Text>
      </View>
    );
  }

  const latestWeekly = weeklySummaries?.results?.[0] || null;
  const allTriggerPhrases = dashboard.top_triggers.map((t) => t.phrase);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <Text style={styles.header}>인사이트</Text>
      <Text style={styles.headerSubtitle}>대화 패턴을 관찰적으로 정리했어요</Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard label="총 세션" value={String(dashboard.total_sessions)} />
        <StatCard label="트리거 표현" value={String(dashboard.trigger_phrase_count)} />
        <StatCard
          label="평균 강도"
          value={String(dashboard.avg_escalation)}
          suffix="/10"
        />
      </View>

      {/* Weekly Summary (latest) */}
      {latestWeekly && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주간 요약</Text>
          <WeeklySummaryCard summary={latestWeekly} />
        </View>
      )}

      {/* Charts */}
      <View style={styles.section}>
        <ConflictFrequencyChart data={dashboard.sessions_by_week} />
        <TopicDistributionChart data={dashboard.top_categories} />
        <EscalationTrendChart data={dashboard.escalation_by_week} />
      </View>

      {/* Top Triggers */}
      {dashboard.top_triggers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>자주 등장하는 트리거 표현</Text>
          <View style={styles.listCard}>
            {dashboard.top_triggers.map((trigger) => (
              <View key={trigger.phrase} style={styles.listItem}>
                <TriggerHighlight
                  text={trigger.phrase}
                  triggerPhrases={[trigger.phrase]}
                  textStyle={styles.triggerText}
                />
                <Text style={styles.triggerCount}>{trigger.count}회</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Top Topics */}
      {dashboard.top_categories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주요 갈등 주제</Text>
          <View style={styles.listCard}>
            {dashboard.top_categories.map((cat) => (
              <View key={cat.category} style={styles.listItem}>
                <Text style={styles.topicText}>{cat.category}</Text>
                <Text style={styles.topicCount}>{cat.count}회</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Bottom spacing */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// --- Stats Card ---

interface StatCardProps {
  label: string;
  value: string;
  suffix?: string;
}

function StatCard({ label, value, suffix }: StatCardProps): React.ReactElement {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>
        {value}
        {suffix && <Text style={styles.statSuffix}>{suffix}</Text>}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.bgPage,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.gray800,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  statSuffix: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  // Sections
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: headingFont,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  // List card
  listCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgAiMessage,
  },
  triggerText: {
    fontSize: 15,
    color: colors.gray800,
    flex: 1,
    marginRight: 12,
  },
  triggerCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  topicText: {
    fontSize: 15,
    color: colors.gray800,
    flex: 1,
    marginRight: 12,
  },
  topicCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  bottomSpacer: {
    height: 32,
  },
});
