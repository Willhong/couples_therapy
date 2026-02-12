import { api } from '@/lib/api';
import type { InsightReportSummary, InsightReportDetail } from './types';

export async function getReports(): Promise<InsightReportSummary[]> {
  const response = await api.get<InsightReportSummary[]>('/intelligence/reports/');
  return response.data;
}

export async function getReportDetail(id: number): Promise<InsightReportDetail> {
  const response = await api.get<InsightReportDetail>(`/intelligence/reports/${id}/`);
  return response.data;
}

export async function markReportRead(id: number): Promise<void> {
  await api.post(`/intelligence/reports/${id}/read/`);
}

export async function getUnreadCount(): Promise<number> {
  const response = await api.get<{ count: number }>('/intelligence/reports/unread-count/');
  return response.data.count;
}
