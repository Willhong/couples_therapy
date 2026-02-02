/**
 * Insights feature type definitions
 * Types matching the backend /api/v1/patterns/ endpoints
 */

/** Dashboard data from /api/v1/patterns/dashboard/ */
export interface DashboardData {
  total_sessions: number;
  trigger_phrase_count: number;
  recurring_topic_count: number;
  avg_escalation: number;
  top_categories: CategoryStat[];
  top_triggers: TriggerStat[];
  escalation_by_week: WeeklyEscalation[];
  sessions_by_week: WeeklySession[];
}

export interface CategoryStat {
  category: string;
  count: number;
}

export interface TriggerStat {
  phrase: string;
  count: number;
}

export interface WeeklyEscalation {
  week: string;
  avg_score: number;
  count: number;
}

export interface WeeklySession {
  week: string;
  count: number;
}

/** Weekly summary from /api/v1/patterns/weekly/ */
export interface WeeklySummaryData {
  id: string;
  period_start: string;
  period_end: string;
  session_count: number;
  top_topics: Array<{ topic: string; count: number }>;
  trigger_frequency: Record<string, number>;
  trend_text: string | null;
  escalation_trend: 'improving' | 'stable' | 'worsening';
  created_at: string;
}

/** Session-level insight from /api/v1/patterns/session/{id}/ */
export interface SessionInsight {
  id: string;
  conversation_id: string;
  trigger_phrases: string[];
  recurring_topics: string[];
  escalation_score: number;
  ai_summary: string | null;
  created_at: string;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  count: number;
  page: number;
  page_size: number;
  results: T[];
}
