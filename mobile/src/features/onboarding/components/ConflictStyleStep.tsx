/**
 * ConflictStyleStep component
 * Conflict resolution style and communication frequency selection
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';
import type { OnboardingFormData, ConflictStyle, CommunicationFrequency } from '../types';

interface ConflictStyleStepProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
}

/**
 * Conflict style options with Korean labels and descriptions
 */
const CONFLICT_STYLES: Array<{
  value: ConflictStyle;
  label: string;
  description: string;
}> = [
  {
    value: 'avoid',
    label: '회피형',
    description: '갈등 상황을 피하고 시간이 해결해주길 기다려요',
  },
  {
    value: 'confront',
    label: '대면형',
    description: '문제가 생기면 바로 이야기하고 해결하려 해요',
  },
  {
    value: 'collaborate',
    label: '협력형',
    description: '서로의 입장을 나누며 함께 해결책을 찾아요',
  },
  {
    value: 'compromise',
    label: '타협형',
    description: '서로 조금씩 양보해서 중간점을 찾아요',
  },
];

/**
 * Communication frequency options with Korean labels
 */
const COMMUNICATION_FREQUENCIES: Array<{
  value: CommunicationFrequency;
  label: string;
  description: string;
}> = [
  {
    value: 'daily',
    label: '매일',
    description: '거의 매일 대화해요',
  },
  {
    value: 'weekly',
    label: '주 1-2회',
    description: '일주일에 한두 번 정도 깊은 대화를 해요',
  },
  {
    value: 'rarely',
    label: '거의 안함',
    description: '대화하기 어려운 상황이에요',
  },
];

/**
 * Conflict style step for onboarding questionnaire
 * Assesses how user handles conflicts and communication frequency
 */
export function ConflictStyleStep({
  control,
  errors,
}: ConflictStyleStepProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>갈등 대응 방식</Text>
      <Text style={styles.description}>
        갈등 상황에서 주로 어떻게 대응하시나요?
      </Text>

      {/* Conflict style selection */}
      <View style={styles.questionBlock}>
        <Text style={styles.question}>갈등 해결 스타일</Text>
        <Controller
          control={control}
          name="conflictStyle"
          render={({ field: { onChange, value } }) => (
            <View style={styles.optionsContainer}>
              {CONFLICT_STYLES.map((style) => (
                <TouchableOpacity
                  key={style.value}
                  style={[
                    styles.optionCard,
                    value === style.value && styles.optionCardSelected,
                  ]}
                  onPress={() => onChange(style.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioOuter}>
                    {value === style.value && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionLabel,
                        value === style.value && styles.optionLabelSelected,
                      ]}
                    >
                      {style.label}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {style.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.conflictStyle && (
          <Text style={styles.errorText}>
            갈등 해결 스타일을 선택해주세요
          </Text>
        )}
      </View>

      {/* Communication frequency */}
      <View style={styles.questionBlock}>
        <Text style={styles.question}>소통 빈도</Text>
        <Text style={styles.questionHint}>
          파트너와 감정이나 생각을 나누는 대화는 얼마나 자주 하시나요?
        </Text>
        <Controller
          control={control}
          name="communicationFrequency"
          render={({ field: { onChange, value } }) => (
            <View style={styles.frequencyContainer}>
              {COMMUNICATION_FREQUENCIES.map((freq) => (
                <TouchableOpacity
                  key={freq.value}
                  style={[
                    styles.frequencyOption,
                    value === freq.value && styles.frequencyOptionSelected,
                  ]}
                  onPress={() => onChange(freq.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.frequencyLabel,
                      value === freq.value && styles.frequencyLabelSelected,
                    ]}
                  >
                    {freq.label}
                  </Text>
                  <Text style={styles.frequencyDescription}>
                    {freq.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.communicationFrequency && (
          <Text style={styles.errorText}>
            소통 빈도를 선택해주세요
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
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray300,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  frequencyContainer: {
    gap: 12,
  },
  frequencyOption: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  frequencyOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  frequencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 4,
  },
  frequencyLabelSelected: {
    color: colors.primary,
  },
  frequencyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 8,
  },
});
