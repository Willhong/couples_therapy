import { api } from '@/lib/api';

export interface CheckIn {
  id: number;
  mood: number;
  mood_display: string;
  note: string;
  date: string;
  created_at: string;
}

export interface Streak {
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
}

export async function getTodayCheckIn(): Promise<CheckIn | null> {
  try {
    const response = await api.get<CheckIn>('/checkins/today/');
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 204) return null;
    throw error;
  }
}

export async function getStreak(): Promise<Streak> {
  const response = await api.get<Streak>('/checkins/streak/');
  return response.data;
}

export async function submitCheckIn(mood: number, note?: string): Promise<CheckIn> {
  const response = await api.post<CheckIn>('/checkins/', { mood, note: note || '' });
  return response.data;
}
