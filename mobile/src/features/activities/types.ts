export interface Recommendation {
  type: string;
  item_id: number;
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  source: string;
}

export interface EffectivenessItem {
  category: string;
  avg_rating: number;
  mood_impact: number;
  count: number;
}
