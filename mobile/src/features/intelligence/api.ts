import { api } from '@/lib/api';
import type { InsightReportSummary, InsightReportDetail } from './types';
import type { BackendInsightReportSummary, BackendInsightReportDetail } from './types';
import { toInsightReportDetail, toInsightReportSummary } from './adapters';

export async function getReports(): Promise<InsightReportSummary[]> {
  const response = await api.get<BackendInsightReportSummary[]>('/intelligence/reports/');
  return response.data.map(toInsightReportSummary);
}

export async function getReportDetail(id: string): Promise<InsightReportDetail> {
  const response = await api.get<BackendInsightReportDetail>(`/intelligence/reports/${id}/`);
  return toInsightReportDetail(response.data);
}

export async function markReportRead(id: string): Promise<void> {
  await api.post(`/intelligence/reports/${id}/read/`);
}

export async function getUnreadCount(): Promise<number> {
  const response = await api.get<{ count?: number; unread_count?: number }>('/intelligence/reports/unread-count/');
  return typeof response.data.count === 'number' ? response.data.count : response.data.unread_count || 0;
}
