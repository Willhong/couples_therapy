import { api } from '@/lib/api';

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

export async function startActivity(activityId: number): Promise<void> {
  await api.post(`/activities/${activityId}/start/`);
}
