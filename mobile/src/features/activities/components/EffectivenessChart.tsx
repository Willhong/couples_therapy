import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colors } from '@/theme';
import type { EffectivenessItem } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80;

const BAR_COLORS = [colors.primary, colors.warningAmber, colors.success, colors.error, colors.primary];

interface Props {
  data: EffectivenessItem[];
}

export function EffectivenessChart({ data }: Props): React.ReactElement {
  if (data.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>활동 효과</Text>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>데이터가 부족합니다</Text>
        </View>
      </View>
    );
  }

  const barData = data.map((item, index) => ({
    value: item.avg_rating,
    label: item.category,
    frontColor: BAR_COLORS[index % BAR_COLORS.length],
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>활동 효과</Text>
      <Text style={styles.cardSubtitle}>카테고리별 평균 평점</Text>
      <View style={styles.chartContainer}>
        <BarChart
          data={barData}
          width={CHART_WIDTH}
          height={160}
          barWidth={32}
          spacing={20}
          xAxisLabelTextStyle={styles.axisLabel}
          yAxisTextStyle={styles.axisLabel}
          noOfSections={5}
          maxValue={5}
          barBorderRadius={4}
          initialSpacing={20}
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
