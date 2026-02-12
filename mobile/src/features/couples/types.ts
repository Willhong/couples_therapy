export interface UserStats {
  avg_mood: number;
  streak: number;
  conversation_count: number;
}

export interface PartnerStats {
  display_name: string;
  avg_mood: number;
  streak: number;
  conversation_count: number;
}

export interface PartnerDashboardData {
  user_stats: UserStats;
  partner_stats: PartnerStats;
  connected_since: string;
  couple_id: number;
}
