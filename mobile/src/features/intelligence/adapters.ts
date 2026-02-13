import {
  type BackendInsightReportDetail,
  type BackendInsightReportSummary,
  type InsightReportDetail,
  type InsightReportSummary,
  type ReportStatus,
} from './types';

const FALLBACK_REPORT_TYPE = 'accumulative';
const PREVIEW_LIMIT = 160;

function normalizeStatus(
  status: string,
  isRead?: boolean,
): ReportStatus {
  if (status === 'completed') {
    return isRead ? 'read' : 'generated';
  }
  return (status as ReportStatus) || 'pending';
}

function truncateText(value: string | null | undefined): string {
  const clean = (value || '').trim();
  if (!clean) {
    return '';
  }
  return clean.length > PREVIEW_LIMIT ? `${clean.slice(0, PREVIEW_LIMIT).trimEnd()}...` : clean;
}

export function toInsightReportSummary(
  item: BackendInsightReportSummary,
): InsightReportSummary {
  return {
    id: item.id,
    title: item.report_title,
    report_type: item.report_type || item.trigger_tier || FALLBACK_REPORT_TYPE,
    status: normalizeStatus(item.status, item.is_read),
    created_at: item.created_at,
    preview: item.preview || truncateText(item.report_summary || item.report_title),
  };
}

export function toInsightReportDetail(item: BackendInsightReportDetail): InsightReportDetail {
  const status: ReportStatus = normalizeStatus(item.status, item.is_read);
  return {
    id: item.id,
    title: item.report_title,
    report_type: item.report_type || item.trigger_tier || FALLBACK_REPORT_TYPE,
    status,
    created_at: item.created_at,
    insights: item.key_insights || [],
    recommended_actions: item.suggested_actions || [],
    recommended_activities: item.recommended_activities || [],
    full_text: item.report_summary || '',
    is_read: item.is_read,
  };
}
