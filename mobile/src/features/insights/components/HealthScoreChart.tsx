/**
 * HealthScoreChart component
 * Area line chart showing health score history over time.
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors, alpha } from '@/theme';
import { useHealthScoreHistory } from '../hooks/useInsights';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80;

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

export function HealthScoreChart(): React.ReactElement | null {
  const { data, loading } = useHealthScoreHistory(30);

  if (loading) return null;

  if (!data || data.history.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>관계 건강 점수 추이</Text>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>데이터가 부족합니다</Text>
        </View>
      </View>
    );
  }

  const lineData = data.history.map((item) => ({
    value: item.score,
    label: formatDateLabel(item.date),
    dataPointText: String(item.score),
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>관계 건강 점수 추이</Text>
      <Text style={styles.cardSubtitle}>최근 {data.days}일</Text>
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
          startFillColor={alpha(colors.primary, 0.2)}
          endFillColor={alpha(colors.primary, 0.01)}
          noOfSections={4}
          maxValue={100}
          spacing={CHART_WIDTH / Math.max(lineData.length, 1)}
          initialSpacing={20}
          endSpacing={20}
          hideRules
        />
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
