/**
 * CheckInFlow - Full-screen multi-step check-in wizard
 * 4 steps with text input questions about the relationship.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, X, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';
import { submitDetailedCheckIn } from '../api';

const QUESTIONS = [
  '이번 주 파트너가 사랑받는다고\n느끼게 해준 일이 있나요?',
  '최근 파트너와의 관계에서\n감사한 점이 있나요?',
  '이번 주 파트너와 나누고\n싶은 이야기가 있나요?',
  '관계에서 개선하고 싶은 점이\n있다면 무엇인가요?',
];

const MAX_CHARS = 500;
const TOTAL_STEPS = QUESTIONS.length;

export function CheckInFlow(): React.ReactElement {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(TOTAL_STEPS).fill(''));
  const [submitting, setSubmitting] = useState(false);

  const currentAnswer = answers[currentStep];

  const updateAnswer = useCallback((text: string) => {
    if (text.length > MAX_CHARS) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentStep] = text;
      return next;
    });
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === 0) {
      router.back();
    } else {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep, router]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleContinue = useCallback(async () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Last step - submit
      setSubmitting(true);
      try {
        await submitDetailedCheckIn(answers);
        router.back();
      } catch {
        Alert.alert('오류', '체크인을 저장하지 못했습니다. 다시 시도해 주세요.');
      } finally {
        setSubmitting(false);
      }
    }
  }, [currentStep, answers, router]);

  const handleSkip = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Skip last step - submit what we have
      handleContinue();
    }
  }, [currentStep, handleContinue]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={handleBack}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressBar,
                  { backgroundColor: i <= currentStep ? '#7C9082' : '#E8E4DF' },
                ]}
              />
            ))}
          </View>

          <Pressable style={styles.headerButton} onPress={handleClose}>
            <X size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Question area */}
          <View style={styles.questionArea}>
            <Text style={styles.stepLabel}>
              {TOTAL_STEPS}단계 중 {currentStep + 1}단계
            </Text>
            <Text style={styles.questionText}>
              {QUESTIONS[currentStep]}
            </Text>
          </View>

          {/* Input area */}
          <View style={styles.inputArea}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={currentAnswer}
                onChangeText={updateAnswer}
                placeholder="여기에 자유롭게 적어주세요..."
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={MAX_CHARS}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {currentAnswer.length}/{MAX_CHARS} 글자
              </Text>
            </View>
          </View>

          {/* Bottom area */}
          <View style={styles.bottomArea}>
            <Pressable
              style={[styles.continueButton, submitting && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={submitting}
            >
              <Text style={styles.continueButtonText}>
                {currentStep < TOTAL_STEPS - 1 ? '계속하기' : '완료하기'}
              </Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </Pressable>

            <Pressable onPress={handleSkip} disabled={submitting}>
              <Text style={styles.skipText}>이 질문 건너뛰기</Text>
            </Pressable>
          </View>
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
  flex: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  // Content
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  // Question
  questionArea: {
    alignItems: 'center',
    paddingTop: 32,
    gap: 16,
  },
  stepLabel: {
    fontSize: 12,
    color: '#8A8A8A',
  },
  questionText: {
    fontFamily: headingFont,
    fontSize: 26,
    fontWeight: '500',
    color: '#2D2D2D',
    textAlign: 'center',
    lineHeight: 35,
  },
  // Input
  inputArea: {
    paddingVertical: 16,
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DF',
    borderRadius: 20,
    padding: 20,
  },
  textInput: {
    fontSize: 15,
    color: '#2D2D2D',
    height: 160,
    lineHeight: 22,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#ADADAD',
    marginTop: 8,
  },
  // Bottom
  bottomArea: {
    gap: 16,
    alignItems: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2D2D2D',
    height: 56,
    borderRadius: 28,
    width: '100%',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipText: {
    color: '#8A8A8A',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
