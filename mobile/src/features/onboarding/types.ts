/**
 * Onboarding types for mobile app
 * Matches backend onboarding app models
 */

/**
 * Attachment style values (1-5 scale)
 */
export type AttachmentScale = 1 | 2 | 3 | 4 | 5;

/**
 * Conflict resolution style options
 */
export type ConflictStyle = 'avoid' | 'confront' | 'collaborate' | 'compromise';

/**
 * Communication frequency options
 */
export type CommunicationFrequency = 'daily' | 'weekly' | 'rarely';

/**
 * Primary goal options
 */
export type PrimaryGoal = 'prevention' | 'improvement' | 'crisis';

/**
 * Focus area options (Korean display names in components)
 */
export type FocusArea =
  | 'communication'    // 소통 개선
  | 'conflict'         // 갈등 해결
  | 'trust'            // 신뢰 회복
  | 'intimacy'         // 친밀감 증진
  | 'expression'       // 감정 표현
  | 'listening';       // 경청 능력

/**
 * User profile data from questionnaire
 */
export interface UserProfile {
  attachment_anxiety: AttachmentScale;
  attachment_avoidance: AttachmentScale;
  conflict_style: ConflictStyle;
  communication_frequency: CommunicationFrequency;
}

/**
 * User goals data from questionnaire
 */
export interface UserGoals {
  primary_goal: PrimaryGoal;
  focus_areas: FocusArea[];
}

/**
 * Onboarding completion status
 */
export interface OnboardingStatus {
  profile_complete: boolean;
  goals_complete: boolean;
  onboarding_complete: boolean;
}

/**
 * Combined onboarding form data
 */
export interface OnboardingFormData {
  attachmentAnxiety: AttachmentScale;
  attachmentAvoidance: AttachmentScale;
  conflictStyle: ConflictStyle;
  communicationFrequency: CommunicationFrequency;
  primaryGoal: PrimaryGoal;
  focusAreas: FocusArea[];
}
