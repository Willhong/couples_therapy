import { api } from '@/lib/api';
import type { Recommendation, EffectivenessItem } from './types';

export interface Activity {
  id: number;
  title: string;
  description: string;
  category: string;
  category_display: string;
  estimated_minutes: number;
  difficulty: number;
  difficulty_display: string;
  is_featured: boolean;
}

export async function getFeaturedActivities(): Promise<Activity[]> {
  const response = await api.get<Activity[]>('/activities/featured/');
  return response.data;
}

export async function getActivitiesByCategory(category: string): Promise<Activity[]> {
  const response = await api.get<Activity[]>('/activities/featured/', {
    params: { category },
  });
  return response.data;
}

export interface CoupleActivity {
  id: number;
  activity: Activity;
  couple: number;
  status: 'in_progress' | 'completed';
  started_at: string;
  completed_at: string | null;
  rating: number | null;
}

export async function startActivity(activityId: number): Promise<CoupleActivity> {
  const response = await api.post<CoupleActivity>(`/activities/${activityId}/start/`);
  return response.data;
}

export async function completeActivity(activityId: number, rating?: number): Promise<CoupleActivity> {
  const response = await api.post<CoupleActivity>(`/activities/${activityId}/complete/`, { rating });
  return response.data;
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const response = await api.get<Recommendation[]>('/activities/recommendations/');
  return response.data;
}

export async function getEffectiveness(days: number = 30): Promise<EffectivenessItem[]> {
  const response = await api.get<EffectivenessItem[]>('/activities/effectiveness/', { params: { days } });
  return response.data;
}
