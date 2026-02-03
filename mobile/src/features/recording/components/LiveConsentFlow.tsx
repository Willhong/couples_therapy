/**
 * LiveConsentFlow - Full UI for live recording consent + recording + submit
 *
 * UI states:
 *   requesting -> waiting (spinner) -> granted (auto-proceed) -> recording -> upload
 *   declined -> narration alternative
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLiveRecording, LivePhase } from '../hooks/useLiveRecording';
import { useWaveform } from '../hooks/useWaveform';
import { uploadAudio, pollTranscriptionStatus } from '../services/audioApi';
import { WaveformVisualizer } from './WaveformVisualizer';
import { RecordingControls } from './RecordingControls';
import { PartnerRecordingIndicator } from './PartnerRecordingIndicator';
import type { TranscriptResult, RecordingMode } from '../types';

interface LiveConsentFlowProps {
  onTranscriptionComplete?: (recordingId: string, mode: RecordingMode, result: TranscriptResult) => void;
  onFallbackToNarration?: () => void;
  onCancel?: () => void;
}

export function LiveConsentFlow({
  onTranscriptionComplete,
  onFallbackToNarration,
  onCancel,
}: LiveConsentFlowProps): React.ReactElement {
  const {
    phase,
    isRequester,
    partnerRecordingStarted,
    partnerRequestedStop,
    requestConsent,
    giveConsent,
    denyConsent,
    startRecording,
    stopRecording,
    sendStopRecording,
    consentSessionId,
    uri,
    metering,
    duration,
    isRecording,
    partnerOnline,
    error,
  } = useLiveRecording();

  const { waveformData, addMeteringValue, reset: resetWaveform } = useWaveform(50);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Feed metering data into waveform hook
  useEffect(() => {
    if (metering.length > 0) {
      const latest = metering[metering.length - 1];
      addMeteringValue(latest);
    }
  }, [metering.length]);

  // Auto-start recording when consent is granted (only for requester)
  useEffect(() => {
    if (phase === 'consent_granted' && isRequester) {
      const timer = setTimeout(() => {
        startRecording();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, isRequester, startRecording]);

  // Auto-stop recording when partner requests stop (for requester)
  useEffect(() => {
    if (partnerRequestedStop && isRecording && isRequester) {
      handleStop();
    }
  }, [partnerRequestedStop, isRecording, isRequester]);

  /**
   * Handle stop: stop recording and upload
   */
  const handleStop = useCallback(async () => {
    const recordedUri = await stopRecording();
    if (!recordedUri) return;

    try {
      setUploadPhase('uploading');
      setUploadError(null);

      const { recording_id } = await uploadAudio(
        recordedUri,
        'live',
        consentSessionId ?? undefined
      );

      setUploadPhase('processing');
      const result = await pollTranscriptionStatus(recording_id);

      setUploadPhase('idle');
      resetWaveform();

      if (onTranscriptionComplete) {
        onTranscriptionComplete(recording_id, 'live', result);
      } else {
        Alert.alert(
          '처리 완료',
          '음성 변환이 완료되었습니다.',
          [{ text: '확인' }]
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '업로드에 실패했습니다.';
      setUploadError(msg);
      setUploadPhase('idle');
    }
  }, [stopRecording, consentSessionId, onTranscriptionComplete, resetWaveform]);

  // ---- UPLOAD PHASE ----
  if (uploadPhase !== 'idle') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6B7FD7" />
          <Text style={styles.statusTitle}>
            {uploadPhase === 'uploading' ? '업로드 중...' : '음성 처리 중...'}
          </Text>
          <Text style={styles.statusDesc}>
            {uploadPhase === 'uploading'
              ? '녹음 파일을 서버로 전송하고 있습니다'
              : '음성을 텍스트로 변환하고 있습니다'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- REQUESTING CONSENT (initial state) ----
  if (phase === 'requesting_consent') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={48} color="#6B7FD7" />
          <Text style={styles.statusTitle}>함께 녹음하기</Text>
          <Text style={styles.statusDesc}>
            파트너에게 녹음 동의를 요청합니다.{'\n'}
            두 분 모두 동의해야 녹음이 시작됩니다.
          </Text>

          {!partnerOnline && (
            <View style={styles.warningBadge}>
              <Ionicons name="warning-outline" size={16} color="#92400E" />
              <Text style={styles.warningText}>파트너가 오프라인입니다</Text>
            </View>
          )}

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <View style={styles.buttonGroup}>
            <Pressable
              style={[styles.primaryButton, !partnerOnline && styles.disabledButton]}
              onPress={requestConsent}
              disabled={!partnerOnline}
            >
              <Text style={styles.primaryButtonText}>동의 요청하기</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={onCancel}>
              <Text style={styles.secondaryButtonText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---- WAITING FOR CONSENT ----
  if (phase === 'waiting_consent') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6B7FD7" />
          <Text style={styles.statusTitle}>동의 대기 중</Text>
          <Text style={styles.statusDesc}>
            파트너의 동의를 기다리고 있습니다...
          </Text>
          <Pressable style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>취소</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ---- RECEIVED REQUEST (responder side) ----
  if (phase === 'received_request') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="mic-outline" size={48} color="#6B7FD7" />
          <Text style={styles.statusTitle}>녹음 동의 요청</Text>
          <Text style={styles.statusDesc}>
            파트너가 함께 녹음하기를 요청했습니다.{'\n'}
            동의하시겠습니까?
          </Text>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <View style={styles.buttonGroup}>
            <Pressable
              style={styles.primaryButton}
              onPress={giveConsent}
            >
              <Text style={styles.primaryButtonText}>동의하기</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={denyConsent}
            >
              <Text style={styles.secondaryButtonText}>거절하기</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---- CONSENT GRANTED ----
  if (phase === 'consent_granted') {
    if (isRequester) {
      // Requester: brief screen before auto-start
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.statusTitle}>동의 완료</Text>
            <Text style={styles.statusDesc}>
              녹음을 시작합니다...
            </Text>
          </View>
        </SafeAreaView>
      );
    } else if (partnerRecordingStarted) {
      // Responder: partner started recording - show indicator
      return (
        <PartnerRecordingIndicator
          partnerName="파트너"
          visible={true}
          onStop={() => {
            sendStopRecording();
            // Also close this screen after requesting stop
            if (onCancel) onCancel();
          }}
        />
      );
    } else {
      // Responder: waiting for partner to start recording
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.statusTitle}>동의 완료</Text>
            <Text style={styles.statusDesc}>
              파트너가 녹음을 시작하면{'\n'}알림이 표시됩니다.
            </Text>
            <Pressable style={styles.secondaryButton} onPress={onCancel}>
              <Text style={styles.secondaryButtonText}>닫기</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }
  }

  // ---- CONSENT DECLINED ----
  if (phase === 'consent_declined') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="close-circle" size={48} color="#EF4444" />
          <Text style={styles.statusTitle}>동의 거절됨</Text>
          <Text style={styles.statusDesc}>
            파트너가 녹음을 거절했거나 시간이 만료되었습니다.{'\n'}
            혼자 기록하기로 전환할 수 있습니다.
          </Text>

          <View style={styles.buttonGroup}>
            {onFallbackToNarration && (
              <Pressable
                style={styles.primaryButton}
                onPress={onFallbackToNarration}
              >
                <Text style={styles.primaryButtonText}>혼자 기록하기</Text>
              </Pressable>
            )}
            <Pressable style={styles.secondaryButton} onPress={onCancel}>
              <Text style={styles.secondaryButtonText}>돌아가기</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---- RECORDING ----
  if (phase === 'recording' || phase === 'stopped') {
    return (
      <SafeAreaView style={styles.container}>
        {/* Red recording indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.redDot} />
            <Text style={styles.recordingIndicatorText}>
              녹음 중 - 파트너와 함께
            </Text>
          </View>
        )}

        <View style={styles.recordingContainer}>
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
            onStart={startRecording}
            onStop={handleStop}
            onCancel={onCancel || (() => {})}
            duration={duration}
          />

          {/* Error messages */}
          {(error || uploadError) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error || uploadError}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Fallback
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6B7FD7" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  statusDesc: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#4B5563',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Recording phase
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
  recordingContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  waveformSection: {
    marginVertical: 24,
  },
  errorContainer: {
    marginHorizontal: 24,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    alignItems: 'center',
  },
});
