/**
 * Safety Assessment component for abuse screening
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
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
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCallHotline(hotline.number)}
                >
                  <Text style={styles.callButtonText}>{hotline.number}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <Text style={styles.disclaimer}>{crisisResources.disclaimer}</Text>

          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>계속하기</Text>
          </TouchableOpacity>
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
              <TouchableOpacity
                key={value}
                style={[
                  styles.scaleButton,
                  currentAnswer === value && styles.scaleButtonActive,
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
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.yesNoContainer}>
            <TouchableOpacity
              style={[
                styles.yesNoButton,
                currentAnswer === 'no' && styles.yesNoButtonActive,
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
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.yesNoButton,
                currentAnswer === 'yes' && styles.yesNoButtonActive,
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
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backText}>이전</Text>
          </TouchableOpacity>
        )}

        {!isLastQuestion ? (
          <TouchableOpacity
            style={[
              styles.nextButton,
              currentStep === 0 && styles.nextButtonFull,
              !canProceed && styles.buttonDisabled,
            ]}
            onPress={goNext}
            disabled={!canProceed}
          >
            <Text style={styles.nextText}>다음</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.nextButton,
              !canProceed && styles.buttonDisabled,
              submitting && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canProceed || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.nextText}>완료</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 24,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6B7FD7',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#111827',
    lineHeight: 30,
    marginBottom: 32,
  },
  scaleContainer: {
    gap: 12,
  },
  scaleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  scaleButtonActive: {
    borderColor: '#6B7FD7',
    backgroundColor: 'rgba(107, 127, 215, 0.05)',
  },
  scaleButtonNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  scaleButtonNumberActive: {
    color: '#6B7FD7',
  },
  scaleLabel: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  yesNoButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  yesNoButtonActive: {
    borderColor: '#6B7FD7',
    backgroundColor: '#6B7FD7',
  },
  yesNoButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  yesNoButtonTextActive: {
    color: '#FFFFFF',
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#6B7FD7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  crisisContainer: {
    paddingTop: 24,
  },
  crisisTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  crisisMessage: {
    fontSize: 16,
    color: '#374151',
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
    color: '#111827',
    marginBottom: 16,
  },
  hotlineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
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
    color: '#111827',
    marginBottom: 4,
  },
  hotlineDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  callButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: '#6B7FD7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
