/**
 * QuestionnaireWizard component
 * Multi-step form wizard for onboarding questionnaire
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { AttachmentStyleStep } from './AttachmentStyleStep';
import { ConflictStyleStep } from './ConflictStyleStep';
import { GoalSelectionStep } from './GoalSelectionStep';
import { useOnboardingProgress } from '../hooks/useOnboardingProgress';
import type { OnboardingFormData, AttachmentScale } from '../types';

/**
 * Zod schema for form validation
 */
const onboardingSchema = z.object({
  attachmentAnxiety: z
    .number()
    .min(1, '값을 선택해주세요')
    .max(5, '값을 선택해주세요'),
  attachmentAvoidance: z
    .number()
    .min(1, '값을 선택해주세요')
    .max(5, '값을 선택해주세요'),
  conflictStyle: z.enum(['avoid', 'confront', 'collaborate', 'compromise'], {
    required_error: '갈등 해결 스타일을 선택해주세요',
  }),
  communicationFrequency: z.enum(['daily', 'weekly', 'rarely'], {
    required_error: '소통 빈도를 선택해주세요',
  }),
  primaryGoal: z.enum(['prevention', 'improvement', 'crisis'], {
    required_error: '현재 상황을 선택해주세요',
  }),
  focusAreas: z
    .array(z.string())
    .min(1, '최소 1개 영역을 선택해주세요')
    .max(3, '최대 3개까지 선택 가능합니다'),
});

/**
 * Step configuration
 */
const STEPS = [
  { id: 'attachment', title: '소통 스타일' },
  { id: 'conflict', title: '갈등 대응' },
  { id: 'goals', title: '목표 설정' },
] as const;

/**
 * Fields to validate for each step
 */
const STEP_FIELDS: Record<number, (keyof OnboardingFormData)[]> = {
  0: ['attachmentAnxiety', 'attachmentAvoidance'],
  1: ['conflictStyle', 'communicationFrequency'],
  2: ['primaryGoal', 'focusAreas'],
};

/**
 * Multi-step questionnaire wizard for onboarding
 */
export function QuestionnaireWizard(): React.ReactElement {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const { submitOnboarding, submitting, error } = useOnboardingProgress();

  const {
    control,
    handleSubmit,
    formState: { errors },
    trigger,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      attachmentAnxiety: 3 as AttachmentScale,
      attachmentAvoidance: 3 as AttachmentScale,
      focusAreas: [],
    },
    mode: 'onChange',
  });

  /**
   * Go to next step with validation
   */
  const goNext = async (): Promise<void> => {
    const isValid = await trigger(STEP_FIELDS[currentStep]);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  /**
   * Go back to previous step
   */
  const goBack = (): void => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  /**
   * Submit form data to API
   */
  const onSubmit = async (data: OnboardingFormData): Promise<void> => {
    const profile = {
      attachment_anxiety: data.attachmentAnxiety,
      attachment_avoidance: data.attachmentAvoidance,
      conflict_style: data.conflictStyle,
      communication_frequency: data.communicationFrequency,
    };

    const goals = {
      primary_goal: data.primaryGoal,
      focus_areas: data.focusAreas as OnboardingFormData['focusAreas'],
    };

    const success = await submitOnboarding(profile, goals);
    if (success) {
      router.replace('/onboarding/partner-link');
    }
  };

  /**
   * Check if current step is the last step
   */
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header with progress */}
        <View style={styles.header}>
          <ProgressBar currentStep={currentStep + 1} totalSteps={STEPS.length} />
          <Text style={styles.stepIndicator}>
            {currentStep + 1} / {STEPS.length}
          </Text>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 0 && (
            <AttachmentStyleStep control={control} errors={errors} />
          )}
          {currentStep === 1 && (
            <ConflictStyleStep control={control} errors={errors} />
          )}
          {currentStep === 2 && (
            <GoalSelectionStep control={control} errors={errors} />
          )}

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.navigation}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={goBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backText}>이전</Text>
            </TouchableOpacity>
          )}

          {!isLastStep ? (
            <TouchableOpacity
              style={[styles.nextButton, currentStep === 0 && styles.nextButtonFull]}
              onPress={goNext}
              activeOpacity={0.7}
            >
              <Text style={styles.nextText}>다음</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.nextButton,
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.nextText}>완료</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepIndicator: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  errorContainer: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.errorBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.errorBg,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.bgAiMessage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  buttonDisabled: {
    backgroundColor: colors.textTertiary,
  },
});
