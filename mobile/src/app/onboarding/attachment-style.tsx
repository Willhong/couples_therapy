/**
 * Onboarding - Attachment Style Screen
 * Step 3/4: User answers questions about their communication/attachment style
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { colors, headingFont } from '@/theme';

type SliderValue = 0 | 1 | 2 | 3 | 4;

const SLIDER_LABELS = ['거의 안함', '가끔', '보통', '자주', '매우 자주'];

const QUESTIONS: Array<{ id: string; question: string; hint: string }> = [
  {
    id: 'closeness',
    question: '파트너와 가까워지는 것이 편안하신가요?',
    hint: '감정을 나누고 의지하는 것이 자연스럽게 느껴지시나요?',
  },
  {
    id: 'anxiety',
    question: '파트너가 떠날까 봐 걱정되시나요?',
    hint: '관계에서 불안감이나 걱정을 자주 느끼시나요?',
  },
];

export default function AttachmentStyleScreen(): React.ReactElement {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, SliderValue>>({
    closeness: 2,
    anxiety: 2,
  });

  const handleSliderChange = (questionId: string, value: SliderValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    // Navigate to next onboarding step
    router.push('/onboarding/questionnaire');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.pressedOpacity]}
          onPress={handleBack}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '75%' }]} />
          </View>
          <Text style={styles.stepLabel}>3/4</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Section */}
        <View style={styles.questionSection}>
          {/* Title & Description */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>소통 스타일 파악</Text>
            <Text style={styles.description}>
              질문에 솔직하게 답해주세요. 정답은 없습니다.
            </Text>
          </View>

          {/* Question Cards */}
          <View style={styles.questionsContainer}>
            {QUESTIONS.map((q) => {
              const currentValue = answers[q.id];
              return (
                <View key={q.id} style={styles.questionCard}>
                  <Text style={styles.questionText}>{q.question}</Text>
                  <Text style={styles.questionHint}>{q.hint}</Text>

                  {/* Slider */}
                  <View style={styles.sliderArea}>
                    <View style={styles.sliderDots}>
                      {[0, 1, 2, 3, 4].map((value) => (
                        <Pressable
                          key={value}
                          style={({ pressed }) => [
                            styles.dotTouchable,
                            pressed && styles.pressedOpacity,
                          ]}
                          onPress={() => handleSliderChange(q.id, value as SliderValue)}
                        >
                          <View
                            style={[
                              styles.dot,
                              currentValue === value && styles.dotSelected,
                            ]}
                          />
                        </Pressable>
                      ))}
                    </View>

                    {/* Track with fill */}
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.trackFill,
                          { width: `${(currentValue / 4) * 100}%` },
                        ]}
                      />
                    </View>

                    {/* Labels */}
                    <View style={styles.labelRow}>
                      {SLIDER_LABELS.map((label, idx) => (
                        <Text
                          key={idx}
                          style={[
                            styles.labelText,
                            idx === 0 && styles.labelFirst,
                            idx === SLIDER_LABELS.length - 1 && styles.labelLast,
                          ]}
                        >
                          {label}
                        </Text>
                      ))}
                    </View>
                  </View>

                  {/* Current Value */}
                  <Text style={styles.currentValue}>
                    현재 선택: {SLIDER_LABELS[currentValue]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomBtns}>
        <Pressable
          style={({ pressed }) => [styles.prevButton, pressed && styles.pressedOpacity]}
          onPress={handleBack}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.nextButton, pressed && styles.pressedOpacity]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>계속하기</Text>
          <ArrowRight size={20} color={colors.white} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  pressedOpacity: {
    opacity: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 40,
  },
  questionSection: {
    gap: 20,
  },
  headerSection: {
    gap: 8,
  },
  title: {
    fontFamily: headingFont,
    fontSize: 24,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 31.2,
  },
  description: {
    fontSize: 14,
    color: '#5A5A5A',
    lineHeight: 21,
  },
  questionsContainer: {
    gap: 20,
  },
  questionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22.4,
  },
  questionHint: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  sliderArea: {
    gap: 8,
  },
  sliderDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    zIndex: 2,
  },
  dotTouchable: {
    padding: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  track: {
    position: 'absolute',
    top: 14,
    left: 8,
    right: 8,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    zIndex: 1,
  },
  trackFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  labelText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  labelFirst: {
    textAlign: 'left',
  },
  labelLast: {
    textAlign: 'right',
  },
  currentValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  bottomBtns: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  prevButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
