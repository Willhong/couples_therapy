/**
 * AttachmentStyleStep component
 * Simplified ECR-R inspired questions for attachment style assessment
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import Slider from '@react-native-community/slider';
import type { OnboardingFormData, AttachmentScale } from '../types';

interface AttachmentStyleStepProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
}

const SCALE_LABELS = ['전혀 아님', '가끔', '보통', '자주', '항상'];

/**
 * Get label for current scale value
 */
function getScaleLabel(value: AttachmentScale): string {
  return SCALE_LABELS[value - 1] || '보통';
}

/**
 * Attachment style step for onboarding questionnaire
 * Measures anxiety (fear of abandonment) and avoidance (discomfort with closeness)
 */
export function AttachmentStyleStep({
  control,
  errors,
}: AttachmentStyleStepProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>소통 스타일 파악</Text>
      <Text style={styles.description}>
        질문에 솔직하게 답해주세요. 정답은 없습니다.
      </Text>

      {/* Avoidance question - reversed for intuitive response */}
      <View style={styles.questionBlock}>
        <Text style={styles.question}>
          파트너와 가까워지는 것이 편안하신가요?
        </Text>
        <Text style={styles.questionHint}>
          감정을 나누고 의지하는 것이 자연스럽게 느껴지시나요?
        </Text>
        <Controller
          control={control}
          name="attachmentAvoidance"
          render={({ field: { onChange, value } }) => (
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={5}
                step={1}
                value={value || 3}
                onValueChange={(val) => onChange(val as AttachmentScale)}
                minimumTrackTintColor="#6B7FD7"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#6B7FD7"
              />
              <View style={styles.labelRow}>
                {SCALE_LABELS.map((label, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.scaleLabel,
                      value === (i + 1) && styles.scaleLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                ))}
              </View>
              <Text style={styles.currentValue}>
                현재 선택: {getScaleLabel(value || 3)}
              </Text>
            </View>
          )}
        />
        {errors.attachmentAvoidance && (
          <Text style={styles.errorText}>
            {errors.attachmentAvoidance.message}
          </Text>
        )}
      </View>

      {/* Anxiety question */}
      <View style={styles.questionBlock}>
        <Text style={styles.question}>
          파트너가 떠날까 봐 걱정되시나요?
        </Text>
        <Text style={styles.questionHint}>
          관계에서 불안감이나 걱정을 자주 느끼시나요?
        </Text>
        <Controller
          control={control}
          name="attachmentAnxiety"
          render={({ field: { onChange, value } }) => (
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={5}
                step={1}
                value={value || 3}
                onValueChange={(val) => onChange(val as AttachmentScale)}
                minimumTrackTintColor="#6B7FD7"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#6B7FD7"
              />
              <View style={styles.labelRow}>
                {SCALE_LABELS.map((label, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.scaleLabel,
                      value === (i + 1) && styles.scaleLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                ))}
              </View>
              <Text style={styles.currentValue}>
                현재 선택: {getScaleLabel(value || 3)}
              </Text>
            </View>
          )}
        />
        {errors.attachmentAnxiety && (
          <Text style={styles.errorText}>
            {errors.attachmentAnxiety.message}
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
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 24,
  },
  questionBlock: {
    marginBottom: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 26,
  },
  questionHint: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  sliderContainer: {
    width: '100%',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  scaleLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    flex: 1,
  },
  scaleLabelActive: {
    color: '#6B7FD7',
    fontWeight: '600',
  },
  currentValue: {
    fontSize: 14,
    color: '#6B7FD7',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
  },
});
