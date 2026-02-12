import { api } from '@/lib/api';
import type { PartnerDashboardData } from './types';

/** Raw backend response shape from /couples/dashboard/ */
interface RawDashboardResponse {
  user: { mood_avg: number | null; checkin_streak: number; conversation_count: number };
  partner: { display_name: string; mood_avg: number | null; checkin_streak: number; conversation_count: number };
  connected_at: string | null;
  couple_id: number;
}

export async function getPartnerDashboard(): Promise<PartnerDashboardData> {
  const response = await api.get<RawDashboardResponse>('/couples/dashboard/');
  const raw = response.data;
  return {
    user_stats: {
      avg_mood: raw.user.mood_avg ?? 3,
      streak: raw.user.checkin_streak,
      conversation_count: raw.user.conversation_count,
    },
    partner_stats: {
      display_name: raw.partner.display_name,
      avg_mood: raw.partner.mood_avg ?? 3,
      streak: raw.partner.checkin_streak,
      conversation_count: raw.partner.conversation_count,
    },
    connected_since: raw.connected_at ?? new Date().toISOString(),
    couple_id: raw.couple_id,
  };
}
