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
} from './types';

// Hooks
export { useDashboard, useWeeklySummaries, useSessionInsight } from './hooks/useInsights';

// Components
export {
  ConflictFrequencyChart,
  TopicDistributionChart,
  EscalationTrendChart,
} from './components/PatternChart';
export { TriggerHighlight } from './components/TriggerHighlight';
export { WeeklySummaryCard } from './components/WeeklySummaryCard';
export { InsightsDashboard } from './components/InsightsDashboard';
