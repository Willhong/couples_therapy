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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ChevronRight, TrendingUp } from 'lucide-react-native';
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

const TRIGGER_EMOJI_MAP: Record<string, string> = {
  '직업': '💼', '일': '💼', '업무': '💼', '회사': '💼',
  '시간': '⏰', '늦': '⏰', '약속': '⏰',
  '가사': '🏠', '집안일': '🏠', '청소': '🏠', '설거지': '🏠', '빨래': '🏠',
  '소통': '💬', '대화': '💬', '말': '💬', '얘기': '💬',
  '돈': '💰', '재정': '💰', '비용': '💰', '지출': '💰',
};

function getTriggerEmoji(phrase: string): string {
  const lower = phrase.toLowerCase();
  for (const [keyword, emoji] of Object.entries(TRIGGER_EMOJI_MAP)) {
    if (lower.includes(keyword)) return emoji;
  }
  return '⚡';
}

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
      <SafeAreaView style={styles.centerContainer} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>인사이트를 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !dashboard) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top', 'left', 'right']}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  // Empty state
  if (!dashboard || dashboard.total_sessions === 0) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top', 'left', 'right']}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>아직 분석할 데이터가 없어요</Text>
        <Text style={styles.emptyDescription}>
          대화나 녹음을 시작하면 패턴 분석 결과가 여기에 표시됩니다
        </Text>
      </SafeAreaView>
    );
  }

  const latestWeekly = weeklySummaries?.results?.[0] || null;
  const allTriggerPhrases = dashboard.top_triggers.map((t) => t.phrase);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.header}>인사이트</Text>
          <Pressable style={styles.periodButton}>
            <Text style={styles.periodButtonText}>이번 주</Text>
            <ChevronDown size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.summaryTitle}>주간 요약</Text>
          </View>
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{dashboard.total_sessions}</Text>
              <Text style={styles.summaryStatLabel}>대화</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{dashboard.trigger_phrase_count}</Text>
              <Text style={styles.summaryStatLabel}>리프레이밍</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{Math.round((1 - dashboard.avg_escalation / 10) * 100)}%</Text>
              <Text style={styles.summaryStatLabel}>긍정적</Text>
            </View>
          </View>
          <ChevronRight size={20} color="rgba(255,255,255,0.6)" style={{ position: 'absolute', right: 20, top: '50%' }} />
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
        <Text style={styles.sectionTitle}>소통 패턴</Text>
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
                <Text style={styles.triggerEmoji}>{getTriggerEmoji(trigger.phrase)}</Text>
                <TriggerHighlight
                  text={trigger.phrase}
                  triggerPhrases={[trigger.phrase]}
                  textStyle={styles.triggerText}
                />
                <Text style={styles.triggerCount}>{trigger.count}회 언급</Text>
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

      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  header: {
    fontFamily: headingFont,
    fontSize: 28,
    fontWeight: '500',
    color: '#2D2D2D',
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8E4DF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2D2D2D',
  },
  // Summary card
  summaryCard: {
    backgroundColor: '#7C9082',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
    gap: 4,
  },
  summaryStatValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  // Sections
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
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
  triggerEmoji: {
    fontSize: 18,
    marginRight: 8,
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
});
