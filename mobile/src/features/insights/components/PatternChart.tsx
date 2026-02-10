/**
 * PatternChart components
 * Three chart types for insights dashboard:
 * - ConflictFrequencyChart: session count per week (line)
 * - TopicDistributionChart: top categories (bar)
 * - EscalationTrendChart: escalation score per week (line)
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { colors, alpha } from '@/theme';
import type { WeeklySession, WeeklyEscalation, CategoryStat } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80; // padding on each side

// --- Conflict Frequency Chart ---

interface ConflictFrequencyProps {
  data: WeeklySession[];
}

export function ConflictFrequencyChart({ data }: ConflictFrequencyProps): React.ReactElement {
  const lineData = data.map((item) => ({
    value: item.count,
    label: formatWeekLabel(item.week),
    dataPointText: String(item.count),
  }));

  if (lineData.length === 0) {
    return <EmptyChartMessage title="갈등 빈도" />;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>갈등 빈도</Text>
      <Text style={styles.cardSubtitle}>주간 세션 수</Text>
      <View style={styles.chartContainer}>
        <LineChart
          data={lineData}
          width={CHART_WIDTH}
          height={160}
          color={colors.primary}
          thickness={2}
          dataPointsColor={colors.primary}
          dataPointsRadius={4}
          xAxisLabelTextStyle={styles.axisLabel}
          yAxisTextStyle={styles.axisLabel}
          curved
          areaChart
          startFillColor={alpha(colors.primary, 0.3)}
          endFillColor={alpha(colors.primary, 0.01)}
          noOfSections={4}
          spacing={CHART_WIDTH / Math.max(lineData.length, 1)}
          initialSpacing={20}
          endSpacing={20}
          hideRules
        />
      </View>
    </View>
  );
}

// --- Topic Distribution Chart ---

interface TopicDistributionProps {
  data: CategoryStat[];
}

const TOPIC_COLORS = [colors.primary, colors.warningAmber, colors.success, colors.error, colors.primary];

export function TopicDistributionChart({ data }: TopicDistributionProps): React.ReactElement {
  const barData = data.map((item, index) => ({
    value: item.count,
    label: item.category,
    frontColor: TOPIC_COLORS[index % TOPIC_COLORS.length],
  }));

  if (barData.length === 0) {
    return <EmptyChartMessage title="주요 갈등 주제" />;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>주요 갈등 주제</Text>
      <Text style={styles.cardSubtitle}>카테고리별 빈도</Text>
      <View style={styles.chartContainer}>
        <BarChart
          data={barData}
          width={CHART_WIDTH}
          height={160}
          barWidth={32}
          spacing={20}
          xAxisLabelTextStyle={styles.axisLabel}
          yAxisTextStyle={styles.axisLabel}
          noOfSections={4}
          barBorderRadius={4}
          initialSpacing={20}
          hideRules
        />
      </View>
    </View>
  );
}

// --- Escalation Trend Chart ---

interface EscalationTrendProps {
  data: WeeklyEscalation[];
}

export function EscalationTrendChart({ data }: EscalationTrendProps): React.ReactElement {
  const lineData = data.map((item) => ({
    value: item.avg_score,
    label: formatWeekLabel(item.week),
    dataPointText: String(item.avg_score),
  }));

  if (lineData.length === 0) {
    return <EmptyChartMessage title="감정 강도 추이" />;
  }

  // Color based on trend: green if decreasing, red if increasing
  const trendColor = getTrendColor(data);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>감정 강도 추이</Text>
      <Text style={styles.cardSubtitle}>주간 평균 에스컬레이션 점수</Text>
      <View style={styles.chartContainer}>
        <LineChart
          data={lineData}
          width={CHART_WIDTH}
          height={160}
          color={trendColor}
          thickness={2}
          dataPointsColor={trendColor}
          dataPointsRadius={4}
          xAxisLabelTextStyle={styles.axisLabel}
          yAxisTextStyle={styles.axisLabel}
          curved
          areaChart
          startFillColor={trendColor === colors.success ? alpha(colors.success, 0.2) : alpha(colors.error, 0.2)}
          endFillColor={trendColor === colors.success ? alpha(colors.success, 0.01) : alpha(colors.error, 0.01)}
          noOfSections={4}
          maxValue={10}
          spacing={CHART_WIDTH / Math.max(lineData.length, 1)}
          initialSpacing={20}
          endSpacing={20}
          hideRules
        />
      </View>
    </View>
  );
}

// --- Helpers ---

function formatWeekLabel(weekStr: string): string {
  const date = new Date(weekStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

function getTrendColor(data: WeeklyEscalation[]): string {
  if (data.length < 2) return colors.textSecondary;
  const first = data[0].avg_score;
  const last = data[data.length - 1].avg_score;
  if (last < first) return colors.success; // improving (green)
  if (last > first) return colors.error; // worsening (red)
  return colors.warningAmber; // stable (amber)
}

function EmptyChartMessage({ title }: { title: string }): React.ReactElement {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>데이터가 부족합니다</Text>
      </View>
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
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textTertiary,
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  axisLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  emptyChart: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
});
