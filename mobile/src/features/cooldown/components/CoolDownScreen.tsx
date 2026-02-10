/**
 * Cool-down screen with countdown timer and breathing guide
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCoolDown } from '../hooks/useCoolDown';
import { BreathingGuide } from './BreathingGuide';
import { colors, alpha } from '@/theme';
import { headingFont } from '@/theme/typography';

const DURATION_OPTIONS = [
  { label: '5분', value: 300 },
  { label: '10분', value: 600 },
  { label: '15분', value: 900 },
  { label: '20분', value: 1200 },
];

export function CoolDownScreen(): React.ReactElement {
  const router = useRouter();
  const {
    cooldown,
    remainingSeconds,
    isLoading,
    startCooldown,
    completeCooldown,
    cancelCooldown,
  } = useCoolDown();

  const [selectedDuration, setSelectedDuration] = useState(600); // 10 minutes default
  const [showCompletion, setShowCompletion] = useState(false);

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle timer completion
  useEffect(() => {
    if (cooldown && remainingSeconds === 0) {
      setShowCompletion(true);
    }
  }, [cooldown, remainingSeconds]);

  // Start cool-down
  const handleStart = async () => {
    try {
      await startCooldown(selectedDuration);
    } catch (error) {
      Alert.alert('오류', '쿨다운을 시작할 수 없습니다.');
    }
  };

  // Cancel cool-down
  const handleCancel = () => {
    Alert.alert(
      '쿨다운 취소',
      '정말 쿨다운을 종료하시겠습니까?',
      [
        { text: '계속하기', style: 'cancel' },
        {
          text: '종료',
          style: 'destructive',
          onPress: async () => {
            await cancelCooldown();
            router.back();
          },
        },
      ]
    );
  };

  // Navigate to chat
  const handleTalk = async () => {
    await completeCooldown();
    router.replace('/(main)/chat');
  };

  // Restart timer
  const handleRestMore = async () => {
    setShowCompletion(false);
    await startCooldown(selectedDuration);
  };

  // If timer is running, show dark-themed breathing guide
  if (cooldown && !showCompletion) {
    return (
      <SafeAreaView style={styles.darkSafeArea}>
        <View style={styles.darkContainer}>
          {/* Close Button */}
          <Pressable onPress={handleCancel} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>

          {/* Breathing Guide */}
          <View style={styles.breathingSection}>
            <BreathingGuide />
          </View>

          {/* Skip Button */}
          <Pressable style={styles.skipButton} onPress={handleCancel}>
            <Text style={styles.skipButtonText}>건너뛰고 계속하기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // If timer completed, show completion screen
  if (showCompletion) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.completionContainer}>
            <Text style={styles.completionEmoji}>✨</Text>
            <Text style={styles.completionTitle}>준비가 되셨나요?</Text>
            <Text style={styles.completionSubtitle}>
              차분한 마음으로 대화를 다시 시작해보세요
            </Text>

            <View style={styles.buttonGroup}>
              <Pressable style={styles.primaryButton} onPress={handleTalk}>
                <Text style={styles.primaryButtonText}>대화하기</Text>
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={handleRestMore}>
                <Text style={styles.secondaryButtonText}>더 쉬기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Initial state: duration selector
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>쿨다운</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.cancelText}>닫기</Text>
          </Pressable>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>잠시 휴식이 필요하신가요?</Text>
          <Text style={styles.descriptionText}>
            감정이 격해졌을 때, 잠시 쉬어가는 것이 도움이 됩니다.{'\n'}
            타이머와 함께 호흡 가이드를 제공해드립니다.
          </Text>
        </View>

        {/* Duration Selector */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorLabel}>시간 선택</Text>
          <View style={styles.durationOptions}>
            {DURATION_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.durationOption,
                  selectedDuration === option.value && styles.durationOptionSelected,
                ]}
                onPress={() => setSelectedDuration(option.value)}
              >
                <Text
                  style={[
                    styles.durationOptionText,
                    selectedDuration === option.value &&
                      styles.durationOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Start Button */}
        <View style={styles.bottomContainer}>
          <Pressable
            style={styles.startButton}
            onPress={handleStart}
            disabled={isLoading}
          >
            <Text style={styles.startButtonText}>
              {isLoading ? '시작 중...' : '시작하기'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  container: {
    flex: 1,
  },
  darkSafeArea: {
    flex: 1,
    backgroundColor: colors.textPrimary,
  },
  darkContainer: {
    flex: 1,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: alpha(colors.white, 0.125),
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: colors.white,
    fontWeight: '400',
  },
  skipButton: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: alpha(colors.white, 0.08),
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: headingFont,
    color: colors.textPrimary,
  },
  cancelText: {
    fontSize: 16,
    color: colors.primary,
  },
  descriptionContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  descriptionTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: headingFont,
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  selectorContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 12,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  durationOption: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
  },
  durationOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: alpha(colors.primary, 0.05),
  },
  durationOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  durationOptionTextSelected: {
    color: colors.primary,
  },
  bottomContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  timerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.white,
    borderWidth: 8,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timerText: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.gray800,
    fontVariant: ['tabular-nums'],
  },
  progressRing: {
    position: 'absolute',
    bottom: -10,
    width: 200,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  breathingSection: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray700,
    textAlign: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  completionEmoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  completionSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
});
