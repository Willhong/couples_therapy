export interface InsightReportSummary {
  id: number;
  title: string;
  report_type: string;
  status: 'generated' | 'read';
  created_at: string;
  preview: string;
}

export interface InsightReportDetail {
  id: number;
  title: string;
  report_type: string;
  status: 'generated' | 'read';
  created_at: string;
  insights: string[];
  recommended_actions: string[];
  recommended_activities: Array<{ id: number; title: string; reason: string }>;
  full_text: string;
}
