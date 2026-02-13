export type ReportStatusCanonical = 'pending' | 'processing' | 'completed' | 'failed';
export type ReportStatusCompat = 'generated' | 'read';
export type ReportStatus = ReportStatusCanonical | ReportStatusCompat;

export interface BackendInsightReportSummary {
  id: string;
  trigger_tier: string | null;
  report_title: string;
  report_type?: string | null;
  status: ReportStatusCanonical;
  created_at: string;
  preview?: string | null;
  report_summary?: string | null;
  data_period_start?: string;
  data_period_end?: string;
  is_read: boolean;
}

export interface BackendInsightReportDetail {
  id: string;
  trigger_tier: string | null;
  trigger_reason: string;
  data_period_start?: string;
  data_period_end?: string;
  report_title: string;
  report_summary: string;
  key_insights?: string[];
  suggested_actions?: string[];
  report_type?: string | null;
  status: ReportStatusCanonical;
  is_read: boolean;
  read_at?: string | null;
  in_conversation_delivered: boolean;
  created_at: string;
  recommended_activities: Array<{ id: number; title: string; reason: string }>;
  ethics_review?: Record<string, unknown>;
}

export interface InsightReportSummary {
  id: string;
  title: string;
  report_type: string;
  status: ReportStatus;
  created_at: string;
  preview: string;
}

export interface InsightReportDetail {
  id: string;
  title: string;
  report_type: string;
  status: ReportStatus;
  created_at: string;
  insights: string[];
  recommended_actions: string[];
  recommended_activities: Array<{ id: number; title: string; reason: string }>;
  full_text: string;
  is_read?: boolean;
}
