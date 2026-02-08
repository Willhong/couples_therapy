/**
 * Cool-down feature types
 */

export interface CoolDown {
  id: string;
  duration_seconds: number;
  started_at: string;
  completed_at: string | null;
  is_active: boolean;
}

export interface CoolDownStartRequest {
  duration_seconds: number;
}

export type BreathingPhase = 'inhale' | 'hold' | 'exhale';
