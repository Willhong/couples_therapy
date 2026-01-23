/**
 * Questionnaire screen route
 * Onboarding questionnaire for attachment style, conflict style, and goals
 */

import React from 'react';
import { QuestionnaireWizard } from '@/features/onboarding/components/QuestionnaireWizard';

/**
 * Questionnaire screen component
 * Renders multi-step onboarding wizard
 */
export default function QuestionnaireScreen(): React.ReactElement {
  return <QuestionnaireWizard />;
}
