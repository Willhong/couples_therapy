/**
 * Safety Assessment component for abuse screening
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, alpha } from '@/theme';
import { safetyApi } from '../services/safetyApi';
import { SafetyAssessmentData, SafetyQuestion, CrisisResources } from '../types';
import { getApiErrorMessage } from '@/lib/api';

const SAFETY_QUESTIONS: SafetyQuestion[] = [
  {
    id: 'power_balance',
    text_ko: '관계에서 의사결정이 공평하게 이루어지나요?',
    type: 'scale_1_5',
  },
  {
    id: 'fear',
    text_ko: '파트너에게 두려움을 느낀 적이 있나요?',
    type: 'yes_no',
  },
  {
    id: 'control',
    text_ko: '파트너가 당신의 행동을 통제하려 한 적이 있나요?',
    type: 'yes_no',
  },
  {
    id: 'verbal_abuse',
    text_ko: '파트너에게 모욕적인 말을 들은 적이 있나요?',
    type: 'yes_no',
  },
  {
    id: 'physical_safety',
    text_ko: '신체적으로 안전하지 않다고 느낀 적이 있나요?',
    type: 'yes_no',
  },
];

const SCALE_LABELS = [
  '전혀 공평하지 않음',
  '별로 공평하지 않음',
  '보통',
  '대체로 공평함',
  '매우 공평함',
];

export function SafetyAssessment() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<SafetyAssessmentData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [crisisResources, setCrisisResources] = useState<CrisisResources | null>(null);

  const currentQuestion = SAFETY_QUESTIONS[currentStep];
  const isLastQuestion = currentStep === SAFETY_QUESTIONS.length - 1;

  const handleScaleAnswer = (value: number) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleYesNoAnswer = (value: 'yes' | 'no') => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const goNext = () => {
    if (currentStep < SAFETY_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const data = answers as SafetyAssessmentData;
      const result = await safetyApi.assessSafety(data);

      if (result.risk_level === 'high' && result.crisis_resources) {
        setCrisisResources(result.crisis_resources);
      } else {
        // Navigate to next onboarding step or home
        router.replace('/(main)/home');
      }
    } catch (err) {
      Alert.alert('오류', getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCallHotline = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleContinue = () => {
    router.replace('/(main)/home');
  };

  const currentAnswer = answers[currentQuestion.id];
  const canProceed = currentAnswer !== undefined;

  if (crisisResources) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.crisisContainer}>
          <Text style={styles.crisisTitle}>도움이 필요하신가요?</Text>
          <Text style={styles.crisisMessage}>{crisisResources.message}</Text>

          <View style={styles.hotlinesContainer}>
            <Text style={styles.hotlinesTitle}>긴급 연락처</Text>
            {crisisResources.hotlines.map((hotline, index) => (
              <View key={index} style={styles.hotlineCard}>
                <View style={styles.hotlineInfo}>
                  <Text style={styles.hotlineName}>{hotline.name}</Text>
                  <Text style={styles.hotlineDescription}>
                    {hotline.description}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.callButton,
                    pressed && styles.pressedOpacity,
                  ]}
                  onPress={() => handleCallHotline(hotline.number)}
                >
                  <Text style={styles.callButtonText}>{hotline.number}</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <Text style={styles.disclaimer}>{crisisResources.disclaimer}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.pressedOpacity,
            ]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>계속하기</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((currentStep + 1) / SAFETY_QUESTIONS.length) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentStep + 1} / {SAFETY_QUESTIONS.length}
        </Text>
      </View>

      {/* Question */}
      <ScrollView
        style={styles.questionScroll}
        contentContainerStyle={styles.questionContent}
      >
        <Text style={styles.questionText}>{currentQuestion.text_ko}</Text>

        {currentQuestion.type === 'scale_1_5' ? (
          <View style={styles.scaleContainer}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                style={({ pressed }) => [
                  styles.scaleButton,
                  currentAnswer === value && styles.scaleButtonActive,
                  pressed && styles.pressedOpacity,
                ]}
                onPress={() => handleScaleAnswer(value)}
              >
                <Text
                  style={[
                    styles.scaleButtonNumber,
                    currentAnswer === value && styles.scaleButtonNumberActive,
                  ]}
                >
                  {value}
                </Text>
                <Text style={styles.scaleLabel}>{SCALE_LABELS[value - 1]}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.yesNoContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.yesNoButton,
                currentAnswer === 'no' && styles.yesNoButtonActive,
                pressed && styles.pressedOpacity,
              ]}
              onPress={() => handleYesNoAnswer('no')}
            >
              <Text
                style={[
                  styles.yesNoButtonText,
                  currentAnswer === 'no' && styles.yesNoButtonTextActive,
                ]}
              >
                아니요
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.yesNoButton,
                currentAnswer === 'yes' && styles.yesNoButtonActive,
                pressed && styles.pressedOpacity,
              ]}
              onPress={() => handleYesNoAnswer('yes')}
            >
              <Text
                style={[
                  styles.yesNoButtonText,
                  currentAnswer === 'yes' && styles.yesNoButtonTextActive,
                ]}
              >
                예
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        {currentStep > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressedOpacity,
            ]}
            onPress={goBack}
          >
            <Text style={styles.backText}>이전</Text>
          </Pressable>
        )}

        {!isLastQuestion ? (
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              currentStep === 0 && styles.nextButtonFull,
              !canProceed && styles.buttonDisabled,
              pressed && canProceed && styles.pressedOpacity,
            ]}
            onPress={goNext}
            disabled={!canProceed}
          >
            <Text style={styles.nextText}>다음</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              !canProceed && styles.buttonDisabled,
              submitting && styles.buttonDisabled,
              pressed && canProceed && !submitting && styles.pressedOpacity,
            ]}
            onPress={handleSubmit}
            disabled={!canProceed || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.nextText}>완료</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  content: {
    padding: 24,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  questionScroll: {
    flex: 1,
  },
  questionContent: {
    padding: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 30,
    marginBottom: 32,
  },
  scaleContainer: {
    gap: 12,
  },
  scaleButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  scaleButtonActive: {
    borderColor: colors.primary,
    backgroundColor: alpha(colors.primary, 0.05),
  },
  scaleButtonNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  scaleButtonNumberActive: {
    color: colors.primary,
  },
  scaleLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  yesNoButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  yesNoButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  yesNoButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  yesNoButtonTextActive: {
    color: colors.white,
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
    opacity: 0.5,
  },
  pressedOpacity: {
    opacity: 0.2,
  },
  crisisContainer: {
    paddingTop: 24,
  },
  crisisTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  crisisMessage: {
    fontSize: 16,
    color: colors.gray700,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  hotlinesContainer: {
    marginBottom: 24,
  },
  hotlinesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  hotlineCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  hotlineInfo: {
    marginBottom: 12,
  },
  hotlineName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  hotlineDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  callButton: {
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  disclaimer: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
