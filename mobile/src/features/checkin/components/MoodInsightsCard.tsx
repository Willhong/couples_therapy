import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { colors, alpha } from '@/theme';
import { useMoodInsights } from '../hooks/useMoodInsights';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80;

const MOOD_EMOJI: Record<number, string> = {
  1: '\uD83D\uDE22',
  2: '\uD83D\uDE1F',
  3: '\uD83D\uDE10',
  4: '\uD83D\uDE42',
  5: '\uD83D\uDE0A',
};

function getMoodEmoji(avg: number): string {
  const rounded = Math.round(avg);
  return MOOD_EMOJI[Math.max(1, Math.min(5, rounded))] || '\uD83D\uDE10';
}

const TREND_CONFIG = {
  improving: {
    label: '기분이 좋아지고 있어요',
    color: colors.success,
    Icon: TrendingUp,
  },
  stable: {
    label: '안정적인 상태예요',
    color: colors.warningAmber,
    Icon: Minus,
  },
  declining: {
    label: '기분이 다소 저조해요',
    color: colors.error,
    Icon: TrendingDown,
  },
} as const;

export function MoodInsightsCard(): React.ReactElement | null {
  const { data, loading, error } = useMoodInsights();

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !data || data.count < 3) {
    return null;
  }

  const trendConfig = TREND_CONFIG[data.trend];
  const TrendIcon = trendConfig.Icon;

  const lineData = data.daily_moods.map((item) => ({
    value: item.avg_mood,
    label: formatDateLabel(item.date),
  }));

  const chartColor = trendConfig.color;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>기분 인사이트</Text>

      {/* Average mood + trend */}
      <View style={styles.statsRow}>
        <View style={styles.avgContainer}>
          <Text style={styles.moodEmoji}>{getMoodEmoji(data.avg_mood)}</Text>
          <View>
            <Text style={styles.avgValue}>{data.avg_mood.toFixed(1)}</Text>
            <Text style={styles.avgLabel}>평균 기분</Text>
          </View>
        </View>
        <View style={[styles.trendBadge, { backgroundColor: alpha(trendConfig.color, 0.1) }]}>
          <TrendIcon size={16} color={trendConfig.color} />
          <Text style={[styles.trendLabel, { color: trendConfig.color }]}>
            {trendConfig.label}
          </Text>
        </View>
      </View>

      {/* Chart */}
      {lineData.length > 1 && (
        <View style={styles.chartContainer}>
          <LineChart
            data={lineData}
            width={CHART_WIDTH}
            height={120}
            color={chartColor}
            thickness={2}
            dataPointsColor={chartColor}
            dataPointsRadius={3}
            xAxisLabelTextStyle={styles.axisLabel}
            yAxisTextStyle={styles.axisLabel}
            curved
            areaChart
            startFillColor={alpha(chartColor, 0.2)}
            endFillColor={alpha(chartColor, 0.01)}
            noOfSections={4}
            maxValue={5}
            spacing={CHART_WIDTH / Math.max(lineData.length, 1)}
            initialSpacing={20}
            endSpacing={20}
            hideRules
          />
        </View>
      )}

      {/* Insights list */}
      {data.insights.length > 0 && (
        <View style={styles.insightsList}>
          {data.insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Text style={styles.insightBullet}>{'\u2022'}</Text>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avgContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moodEmoji: {
    fontSize: 32,
  },
  avgValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  avgLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trendLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  axisLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  insightsList: {
    gap: 6,
  },
  insightItem: {
    flexDirection: 'row',
    gap: 6,
  },
  insightBullet: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  insightText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
});
