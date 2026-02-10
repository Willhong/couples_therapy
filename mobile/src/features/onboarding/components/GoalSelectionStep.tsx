/**
 * GoalSelectionStep component
 * Primary goal and focus areas selection
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';
import type { OnboardingFormData, PrimaryGoal, FocusArea } from '../types';

interface GoalSelectionStepProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
}

/**
 * Primary goal options with Korean labels and descriptions
 */
const PRIMARY_GOALS: Array<{
  value: PrimaryGoal;
  label: string;
  emoji: string;
  description: string;
}> = [
  {
    value: 'prevention',
    label: '예방',
    emoji: '💪',
    description: '좋은 관계를 더 좋게 유지하고 싶어요',
  },
  {
    value: 'improvement',
    label: '개선',
    emoji: '🌱',
    description: '작은 갈등들을 줄이고 소통을 개선하고 싶어요',
  },
  {
    value: 'crisis',
    label: '위기 대응',
    emoji: '🆘',
    description: '심각한 갈등 상황을 해결하고 싶어요',
  },
];

/**
 * Focus area options with Korean labels
 */
const FOCUS_AREAS: Array<{
  value: FocusArea;
  label: string;
}> = [
  { value: 'communication', label: '소통 개선' },
  { value: 'conflict', label: '갈등 해결' },
  { value: 'trust', label: '신뢰 회복' },
  { value: 'intimacy', label: '친밀감 증진' },
  { value: 'expression', label: '감정 표현' },
  { value: 'listening', label: '경청 능력' },
];

const MAX_FOCUS_AREAS = 3;

/**
 * Goal selection step for onboarding questionnaire
 * User selects primary goal and up to 3 focus areas
 */
export function GoalSelectionStep({
  control,
  errors,
}: GoalSelectionStepProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>목표 설정</Text>
      <Text style={styles.description}>
        어떤 도움을 받고 싶으신가요?
      </Text>

      {/* Primary goal selection */}
      <View style={styles.questionBlock}>
        <Text style={styles.question}>현재 상황</Text>
        <Controller
          control={control}
          name="primaryGoal"
          render={({ field: { onChange, value } }) => (
            <View style={styles.goalsContainer}>
              {PRIMARY_GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal.value}
                  style={[
                    styles.goalCard,
                    value === goal.value && styles.goalCardSelected,
                  ]}
                  onPress={() => onChange(goal.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                  <Text
                    style={[
                      styles.goalLabel,
                      value === goal.value && styles.goalLabelSelected,
                    ]}
                  >
                    {goal.label}
                  </Text>
                  <Text style={styles.goalDescription}>
                    {goal.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.primaryGoal && (
          <Text style={styles.errorText}>
            현재 상황을 선택해주세요
          </Text>
        )}
      </View>

      {/* Focus areas multi-select */}
      <View style={styles.questionBlock}>
        <Text style={styles.question}>집중하고 싶은 영역</Text>
        <Text style={styles.questionHint}>
          최대 {MAX_FOCUS_AREAS}개까지 선택할 수 있어요
        </Text>
        <Controller
          control={control}
          name="focusAreas"
          render={({ field: { onChange, value = [] } }) => {
            const toggleFocusArea = (area: FocusArea) => {
              const currentAreas = value || [];
              if (currentAreas.includes(area)) {
                // Remove area
                onChange(currentAreas.filter((a) => a !== area));
              } else if (currentAreas.length < MAX_FOCUS_AREAS) {
                // Add area if not at max
                onChange([...currentAreas, area]);
              }
            };

            return (
              <View style={styles.chipsContainer}>
                {FOCUS_AREAS.map((area) => {
                  const isSelected = value?.includes(area.value);
                  const isDisabled =
                    !isSelected && (value?.length || 0) >= MAX_FOCUS_AREAS;

                  return (
                    <TouchableOpacity
                      key={area.value}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                        isDisabled && styles.chipDisabled,
                      ]}
                      onPress={() => toggleFocusArea(area.value)}
                      activeOpacity={isDisabled ? 1 : 0.7}
                      disabled={isDisabled}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          isSelected && styles.chipLabelSelected,
                          isDisabled && styles.chipLabelDisabled,
                        ]}
                      >
                        {area.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          }}
        />
        {errors.focusAreas && (
          <Text style={styles.errorText}>
            {errors.focusAreas.message || '최소 1개 영역을 선택해주세요'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: headingFont,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  questionBlock: {
    marginBottom: 32,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 16,
  },
  questionHint: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 16,
    marginTop: -8,
  },
  goalsContainer: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  goalCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  goalEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray700,
    marginBottom: 4,
  },
  goalLabelSelected: {
    color: colors.primary,
  },
  goalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.5,
    backgroundColor: colors.bgAiMessage,
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray700,
  },
  chipLabelSelected: {
    color: colors.white,
  },
  chipLabelDisabled: {
    color: colors.textTertiary,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 8,
  },
});
