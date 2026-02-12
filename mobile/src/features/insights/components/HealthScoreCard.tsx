/**
 * HealthScoreCard component
 * Hero card with circular score gauge, trend indicator, component breakdown, and insights.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { colors, alpha } from '@/theme';
import { useHealthScore } from '../hooks/useInsights';

const GRADE_LABELS: Record<string, string> = {
  excellent: '매우 좋음',
  good: '좋음',
  fair: '보통',
  poor: '주의',
  critical: '위험',
};

const GRADE_COLORS: Record<string, string> = {
  excellent: colors.success,
  good: colors.primary,
  fair: colors.warningAmber,
  poor: colors.warningDark,
  critical: colors.error,
};

const COMPONENT_LABELS: { key: string; label: string }[] = [
  { key: 'mood', label: '기분' },
  { key: 'escalation', label: '갈등관리' },
  { key: 'engagement', label: '참여도' },
  { key: 'pattern_severity', label: '패턴심각도' },
  { key: 'cooldown', label: '쿨다운' },
];

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp size={16} color={colors.success} />;
  if (trend === 'declining') return <TrendingDown size={16} color={colors.error} />;
  return <Minus size={16} color={colors.textSecondary} />;
}

const TREND_LABELS: Record<string, string> = {
  improving: '개선 중',
  stable: '안정적',
  declining: '하락 중',
};

export function HealthScoreCard(): React.ReactElement | null {
  const { data, loading } = useHealthScore();

  if (loading || !data) return null;

  const gradeColor = GRADE_COLORS[data.grade] || colors.primary;
  const gradeLabel = GRADE_LABELS[data.grade] || data.grade;

  return (
    <View style={styles.card}>
      {/* Score gauge + trend */}
      <View style={styles.topRow}>
        <View style={styles.gaugeContainer}>
          <View style={[styles.gaugeOuter, { borderColor: gradeColor }]}>
            <Text style={[styles.scoreText, { color: gradeColor }]}>{data.score}</Text>
          </View>
          <Text style={[styles.gradeLabel, { color: gradeColor }]}>{gradeLabel}</Text>
        </View>
        <View style={styles.trendContainer}>
          <Text style={styles.trendTitle}>관계 건강 점수</Text>
          <View style={styles.trendRow}>
            <TrendIcon trend={data.trend} />
            <Text style={styles.trendText}>{TREND_LABELS[data.trend] || data.trend}</Text>
          </View>
        </View>
      </View>

      {/* Component breakdown */}
      <View style={styles.componentsContainer}>
        {COMPONENT_LABELS.map(({ key, label }) => {
          const value = (data.components as Record<string, number>)[key] ?? 0;
          return (
            <View key={key} style={styles.componentRow}>
              <Text style={styles.componentLabel}>{label}</Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(value, 100)}%`,
                      backgroundColor: gradeColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.componentValue}>{value}</Text>
            </View>
          );
        })}
      </View>

      {/* Insights */}
      {data.insights.length > 0 && (
        <View style={styles.insightsContainer}>
          {data.insights.map((insight, idx) => (
            <View key={idx} style={styles.insightRow}>
              <Text style={styles.insightBullet}>•</Text>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginRight: 20,
  },
  gaugeOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '700',
  },
  gradeLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  trendContainer: {
    flex: 1,
  },
  trendTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 6,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  componentsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  componentLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    width: 72,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: alpha(colors.textTertiary, 0.2),
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  componentValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray800,
    width: 28,
    textAlign: 'right',
  },
  insightsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 6,
  },
  insightRow: {
    flexDirection: 'row',
    gap: 6,
  },
  insightBullet: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  insightText: {
    fontSize: 14,
    color: colors.gray800,
    flex: 1,
    lineHeight: 20,
  },
});
