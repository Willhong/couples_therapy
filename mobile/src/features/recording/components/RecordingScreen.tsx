/**
 * RecordingScreen - Main recording feature screen
 * Manages full flow: mode selection -> recording -> preview -> upload -> processing
 * Live mode: consent flow -> live recording (via LiveConsentFlow)
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { useWaveform } from '../hooks/useWaveform';
import { uploadAudio, pollTranscriptionStatus } from '../services/audioApi';
import { WaveformVisualizer } from './WaveformVisualizer';
import { RecordingControls } from './RecordingControls';
import { RecordingPreview } from './RecordingPreview';
import { GuidedPrompts } from './GuidedPrompts';
import { LiveConsentFlow } from './LiveConsentFlow';
import { RecordingMode, GuidedPrompt, TranscriptResult } from '../types';

type ScreenPhase =
  | 'mode_select'
  | 'live_consent'
  | 'recording'
  | 'preview'
  | 'uploading'
  | 'processing';

interface RecordingScreenProps {
  onTranscriptionComplete?: (recordingId: string, mode: RecordingMode, result: TranscriptResult) => void;
}

export function RecordingScreen({ onTranscriptionComplete }: RecordingScreenProps = {}): React.ReactElement {
  const router = useRouter();
  const [phase, setPhase] = useState<ScreenPhase>('mode_select');
  const [mode, setMode] = useState<RecordingMode>('narration');
  const [showGuided, setShowGuided] = useState(true);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { state: recordingState, isRecording, startRecording, stopRecording, cancelRecording } =
    useAudioRecording();
  const { waveformData, addMeteringValue, reset: resetWaveform } = useWaveform(50);

  /**
   * Navigate back to previous screen
   */
  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  // Feed metering data into waveform hook
  useEffect(() => {
    if (recordingState.metering.length > 0) {
      const latest = recordingState.metering[recordingState.metering.length - 1];
      addMeteringValue(latest);
    }
  }, [recordingState.metering.length]);

  /**
   * Reset all state to initial values
   */
  const resetToModeSelect = useCallback(() => {
    setPhase('mode_select');
    setMode('narration');
    setSelectedPromptId(null);
    setErrorMessage(null);
    resetWaveform();
  }, [resetWaveform]);

  /**
   * Wrapper for onTranscriptionComplete that resets state before calling parent
   */
  const handleLiveTranscriptionComplete = useCallback(
    (recordingId: string, recordingMode: RecordingMode, result: TranscriptResult) => {
      resetToModeSelect();
      if (onTranscriptionComplete) {
        onTranscriptionComplete(recordingId, recordingMode, result);
      }
    },
    [onTranscriptionComplete, resetToModeSelect]
  );

  /**
   * Select narration mode and enter recording phase
   */
  const handleSelectNarration = useCallback(() => {
    setMode('narration');
    setPhase('recording');
    setErrorMessage(null);
  }, []);

  /**
   * Select live mode -> enter live consent flow
   */
  const handleSelectLive = useCallback(() => {
    setMode('live');
    setPhase('live_consent');
    setErrorMessage(null);
  }, []);

  /**
   * Fallback from live mode to narration after consent decline
   */
  const handleFallbackToNarration = useCallback(() => {
    setMode('narration');
    setPhase('recording');
    setErrorMessage(null);
  }, []);

  /**
   * Cancel from live consent flow
   */
  const handleCancelLiveConsent = useCallback(() => {
    setMode('narration');
    setPhase('mode_select');
    setErrorMessage(null);
  }, []);

  /**
   * Start recording
   */
  const handleStartRecording = useCallback(async () => {
    try {
      setErrorMessage(null);
      await startRecording();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '녹음을 시작할 수 없습니다.';
      setErrorMessage(msg);
    }
  }, [startRecording]);

  /**
   * Stop recording and go to preview
   */
  const handleStopRecording = useCallback(async () => {
    const uri = await stopRecording();
    if (uri) {
      setPhase('preview');
    }
  }, [stopRecording]);

  /**
   * Cancel recording and go back to mode select
   */
  const handleCancelRecording = useCallback(async () => {
    await cancelRecording();
    resetWaveform();
    setPhase('mode_select');
    setSelectedPromptId(null);
  }, [cancelRecording, resetWaveform]);

  /**
   * Re-record: go back to recording phase
   */
  const handleReRecord = useCallback(async () => {
    await cancelRecording();
    resetWaveform();
    setPhase('recording');
  }, [cancelRecording, resetWaveform]);

  /**
   * Submit recording: upload and poll for transcription
   */
  const handleSubmit = useCallback(async () => {
    if (!recordingState.uri) return;

    try {
      setPhase('uploading');
      setErrorMessage(null);

      const { recording_id } = await uploadAudio(recordingState.uri, mode);

      setPhase('processing');

      const result = await pollTranscriptionStatus(recording_id);

      // Mode-aware routing via callback
      if (onTranscriptionComplete) {
        resetWaveform();
        setPhase('mode_select');
        setSelectedPromptId(null);
        onTranscriptionComplete(recording_id, mode, result);
      } else {
        // Fallback: show alert
        Alert.alert(
          '처리 완료',
          result.full_text
            ? result.full_text.substring(0, 300) +
                (result.full_text.length > 300 ? '...' : '')
            : '텍스트 변환이 완료되었습니다.',
          [
            {
              text: '확인',
              onPress: () => {
                resetWaveform();
                setPhase('mode_select');
                setSelectedPromptId(null);
              },
            },
          ]
        );
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : '업로드에 실패했습니다. 다시 시도해주세요.';
      setErrorMessage(msg);
      setPhase('preview');
    }
  }, [recordingState.uri, mode, resetWaveform, onTranscriptionComplete]);

  /**
   * Handle guided prompt selection
   */
  const handlePromptSelect = useCallback((prompt: GuidedPrompt) => {
    setSelectedPromptId((prev) => (prev === prompt.id ? null : prompt.id));
  }, []);

  /**
   * Cancel from preview
   */
  const handleCancelPreview = useCallback(async () => {
    await cancelRecording();
    resetWaveform();
    setPhase('mode_select');
    setSelectedPromptId(null);
  }, [cancelRecording, resetWaveform]);

  // ----- RENDER -----

  // Red recording indicator bar
  const renderRecordingIndicator = (): React.ReactElement | null => {
    if (!isRecording) return null;
    return (
      <View style={styles.recordingIndicator}>
        <View style={styles.redDot} />
        <Text style={styles.recordingIndicatorText}>녹음 중</Text>
      </View>
    );
  };

  // Mode selection screen
  if (phase === 'mode_select') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={styles.headerTitle}>음성 기록</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.modeSelectContainer}>
          <Text style={styles.screenSubtitle}>
            갈등 상황을 음성으로 기록해보세요
          </Text>

          <View style={styles.modeCards}>
            {/* Narration mode */}
            <Pressable
              style={styles.modeCard}
              onPress={handleSelectNarration}
            >
              <Ionicons name="mic-outline" size={32} color="#6B7FD7" />
              <Text style={styles.modeCardTitle}>혼자 기록하기</Text>
              <Text style={styles.modeCardDesc}>
                혼자서 상황을 설명하고{'\n'}감정을 기록합니다
              </Text>
            </Pressable>

            {/* Live mode */}
            <Pressable
              style={styles.modeCard}
              onPress={handleSelectLive}
            >
              <Ionicons name="people-outline" size={32} color="#6B7FD7" />
              <Text style={styles.modeCardTitle}>
                함께 녹음하기
              </Text>
              <Text style={styles.modeCardDesc}>
                파트너와 함께 대화를{'\n'}녹음합니다
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Live consent flow
  if (phase === 'live_consent') {
    return (
      <LiveConsentFlow
        onTranscriptionComplete={handleLiveTranscriptionComplete}
        onFallbackToNarration={handleFallbackToNarration}
        onCancel={handleCancelLiveConsent}
      />
    );
  }

  // Recording phase
  if (phase === 'recording') {
    return (
      <SafeAreaView style={styles.container}>
        {isRecording ? (
          renderRecordingIndicator()
        ) : (
          <View style={styles.header}>
            <Pressable onPress={handleCancelRecording} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </Pressable>
            <Text style={styles.headerTitle}>녹음 준비</Text>
            <View style={styles.headerSpacer} />
          </View>
        )}

        <View style={styles.recordingContainer}>
          {/* Guided prompts toggle */}
          {mode === 'narration' && (
            <View style={styles.guidedToggle}>
              <Text style={styles.guidedToggleLabel}>가이드 질문</Text>
              <Switch
                value={showGuided}
                onValueChange={setShowGuided}
                trackColor={{ false: '#D1D5DB', true: '#6B7FD7' }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}

          {/* Guided prompts */}
          {mode === 'narration' && (
            <GuidedPrompts
              visible={showGuided}
              onPromptSelect={handlePromptSelect}
              selectedId={selectedPromptId}
            />
          )}

          {/* Waveform */}
          <View style={styles.waveformSection}>
            <WaveformVisualizer
              waveformData={waveformData}
              isRecording={isRecording}
            />
          </View>

          {/* Controls */}
          <RecordingControls
            isRecording={isRecording}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            onCancel={handleCancelRecording}
            duration={recordingState.duration}
          />

          {/* Error message */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Preview phase
  if (phase === 'preview' && recordingState.uri) {
    return (
      <SafeAreaView style={styles.container}>
        <RecordingPreview
          uri={recordingState.uri}
          duration={recordingState.duration}
          onSubmit={handleSubmit}
          onReRecord={handleReRecord}
          onCancel={handleCancelPreview}
        />
        {/* Error message */}
        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={handleSubmit}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Uploading / Processing phase
  if (phase === 'uploading' || phase === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#6B7FD7" />
          <Text style={styles.processingText}>
            {phase === 'uploading' ? '업로드 중...' : '음성 처리 중...'}
          </Text>
          <Text style={styles.processingSubtext}>
            {phase === 'uploading'
              ? '녹음 파일을 서버로 전송하고 있습니다'
              : '음성을 텍스트로 변환하고 있습니다'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback (should not reach)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.processingContainer}>
        <Text style={styles.processingText}>잠시만 기다려주세요...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Header with back button
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 32,
  },
  // Recording indicator
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    gap: 8,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  recordingIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
  },
  // Mode selection
  modeSelectContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
  },
  modeCards: {
    gap: 16,
  },
  modeCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modeCardDisabled: {
    opacity: 0.5,
  },
  modeCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 4,
  },
  modeCardTitleDisabled: {
    color: '#9CA3AF',
  },
  modeCardDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modeCardDescDisabled: {
    color: '#D1D5DB',
  },
  comingSoonBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  comingSoonText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  // Recording phase
  recordingContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  guidedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  guidedToggleLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  waveformSection: {
    marginVertical: 24,
  },
  // Error
  errorContainer: {
    marginHorizontal: 24,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // Processing
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  processingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
