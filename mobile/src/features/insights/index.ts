/**
 * Insights feature barrel export
 */

// Types
export type {
  DashboardData,
  WeeklySummaryData,
  SessionInsight,
  CategoryStat,
  TriggerStat,
  WeeklyEscalation,
  WeeklySession,
  PaginatedResponse,
  HealthScoreData,
  HealthScoreHistoryItem,
  HealthScoreHistoryResponse,
} from './types';

// Hooks
export {
  useDashboard,
  useWeeklySummaries,
  useSessionInsight,
  useHealthScore,
  useHealthScoreHistory,
} from './hooks/useInsights';

// Components
export {
  ConflictFrequencyChart,
  TopicDistributionChart,
  EscalationTrendChart,
} from './components/PatternChart';
export { TriggerHighlight } from './components/TriggerHighlight';
export { WeeklySummaryCard } from './components/WeeklySummaryCard';
export { InsightsDashboard } from './components/InsightsDashboard';
export { InsightsPreviewCard } from './components/InsightsPreviewCard';
export { HealthScoreCard } from './components/HealthScoreCard';
export { HealthScoreChart } from './components/HealthScoreChart';
