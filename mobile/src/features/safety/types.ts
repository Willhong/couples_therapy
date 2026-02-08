/**
 * Safety assessment feature types
 */

export interface SafetyAssessment {
  id: number;
  risk_level: 'low' | 'moderate' | 'high';
  risk_level_display: string;
  assessment_data: SafetyAssessmentData;
  completed_at: string | null;
  couple_features_enabled: boolean;
  created_at: string;
  updated_at: string;
  crisis_resources?: CrisisResources;
}

export interface SafetyAssessmentData {
  power_balance: number;
  fear: 'yes' | 'no';
  control: 'yes' | 'no';
  verbal_abuse: 'yes' | 'no';
  physical_safety: 'yes' | 'no';
}

export interface CrisisResources {
  hotlines: Hotline[];
  message: string;
  disclaimer: string;
}

export interface Hotline {
  name: string;
  number: string;
  description: string;
}

export interface SafetyQuestion {
  id: keyof SafetyAssessmentData;
  text_ko: string;
  type: 'scale_1_5' | 'yes_no';
}
