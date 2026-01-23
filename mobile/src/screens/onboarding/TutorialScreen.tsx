import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  CopilotProvider,
  CopilotStep,
  useCopilot,
  walkthroughable,
} from 'react-native-copilot';
import { useOnboarding } from '@/hooks/useOnboarding';

const { width } = Dimensions.get('window');

// Walkthroughable components
const WalkthroughableView = walkthroughable(View);

/**
 * Mock home layout for tutorial
 * Shows placeholder UI elements that represent main app features
 */
function MockHomeLayout(): React.ReactElement {
  return (
    <View style={styles.mockLayout}>
      {/* Header area */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CouplesAI</Text>
        <CopilotStep
          text="설정에서 동의 내역을 확인하고 튜토리얼을 다시 볼 수 있어요."
          order={4}
          name="settings"
        >
          <WalkthroughableView style={styles.settingsIcon}>
            <Text style={styles.settingsText}>설정</Text>
          </WalkthroughableView>
        </CopilotStep>
      </View>

      {/* Main content area */}
      <View style={styles.content}>
        {/* Record button */}
        <CopilotStep
          text="여기서 오늘의 감정과 상황을 기록할 수 있어요."
          order={1}
          name="record"
        >
          <WalkthroughableView style={styles.mockCard}>
            <Text style={styles.cardIcon}>+</Text>
            <Text style={styles.cardTitle}>기록하기</Text>
            <Text style={styles.cardDescription}>오늘의 감정을 기록해보세요</Text>
          </WalkthroughableView>
        </CopilotStep>

        {/* Conflict recording button */}
        <CopilotStep
          text="파트너와 함께 녹음을 시작하려면 여기를 눌러주세요. 녹음은 양측 동의 후에만 시작됩니다."
          order={2}
          name="conflict"
        >
          <WalkthroughableView style={[styles.mockCard, styles.conflictCard]}>
            <Text style={styles.cardIcon}>🎙️</Text>
            <Text style={styles.cardTitle}>갈등 녹음</Text>
            <Text style={styles.cardDescription}>
              대화를 녹음하고 분석받아보세요
            </Text>
          </WalkthroughableView>
        </CopilotStep>

        {/* Insights section */}
        <CopilotStep
          text="AI가 분석한 리프레이밍 결과를 확인할 수 있어요."
          order={3}
          name="insights"
        >
          <WalkthroughableView style={[styles.mockCard, styles.insightsCard]}>
            <Text style={styles.cardIcon}>✨</Text>
            <Text style={styles.cardTitle}>인사이트</Text>
            <Text style={styles.cardDescription}>
              파트너의 관점을 이해해보세요
            </Text>
          </WalkthroughableView>
        </CopilotStep>
      </View>
    </View>
  );
}

/**
 * Tutorial content with copilot hooks
 */
function TutorialContent(): React.ReactElement {
  const router = useRouter();
  const { start, copilotEvents, currentStep } = useCopilot();
  const { markTutorialCompleted, loading } = useOnboarding();
  const [isCompleting, setIsCompleting] = useState(false);
  const [tutorialStarted, setTutorialStarted] = useState(false);

  // Handle tutorial completion
  const handleTutorialComplete = useCallback(async () => {
    if (isCompleting) return;
    setIsCompleting(true);

    try {
      await markTutorialCompleted();
      router.replace('/(main)/home');
    } catch (error) {
      console.error('Failed to mark tutorial complete:', error);
      Alert.alert(
        '오류',
        '튜토리얼 완료 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
        [
          {
            text: '다시 시도',
            onPress: () => {
              setIsCompleting(false);
            },
          },
        ]
      );
    }
  }, [isCompleting, markTutorialCompleted, router]);

  // Auto-start tutorial on mount (only once)
  useEffect(() => {
    if (tutorialStarted) return;

    // Delay to ensure layout is fully ready
    const timer = setTimeout(() => {
      setTutorialStarted(true);
      start();
    }, 1000);

    return () => clearTimeout(timer);
  }, [tutorialStarted, start]);

  // Listen for tutorial finish
  useEffect(() => {
    const handleStop = () => {
      handleTutorialComplete();
    };

    copilotEvents.on('stop', handleStop);

    return () => {
      copilotEvents.off('stop', handleStop);
    };
  }, [copilotEvents, handleTutorialComplete]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>앱 사용법을 알아볼까요?</Text>
        <Text style={styles.subtitle}>
          주요 기능을 차례로 안내해드릴게요
        </Text>
      </View>
      <MockHomeLayout />

      {(loading || isCompleting) && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>완료 처리 중...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

/**
 * Tutorial screen with CopilotProvider
 * Coach-mark tour of main app features
 * CRITICAL: No skip button (mandatory per CONTEXT.md)
 */
export default function TutorialScreen(): React.ReactElement {
  // Android needs vertical offset adjustment for status bar
  const androidOffset = Platform.OS === 'android'
    ? -(StatusBar.currentHeight || 24)
    : 0;

  return (
    <CopilotProvider
      labels={{
        previous: '이전',
        next: '다음',
        skip: '', // CRITICAL: Empty string - no skip button (mandatory)
        finish: '시작하기',
      }}
      stepNumberComponent={() => null}
      overlay="svg"
      backdropColor="rgba(0, 0, 0, 0.7)"
      tooltipStyle={styles.tooltip}
      arrowColor="#FFFFFF"
      animated
      androidStatusBarVisible
      verticalOffset={androidOffset}
    >
      <TutorialContent />
    </CopilotProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  titleContainer: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  mockLayout: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  settingsIcon: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  settingsText: {
    fontSize: 14,
    color: '#4B5563',
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  mockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  conflictCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  insightsCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  tooltip: {
    borderRadius: 12,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
