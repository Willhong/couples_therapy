/**
 * PartnerRecordingIndicator - Shown on partner's device when they consented
 * Persistent red overlay with timer and stop button
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PartnerRecordingIndicatorProps {
  /** Partner's display name */
  partnerName?: string;
  /** Called when partner presses stop */
  onStop: () => void;
  /** Called when recording stops (from the initiating side) */
  visible: boolean;
}

/**
 * Format seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PartnerRecordingIndicator({
  partnerName = '파트너',
  onStop,
  visible,
}: PartnerRecordingIndicatorProps): React.ReactElement | null {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsed(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <SafeAreaView style={styles.overlay}>
      <View style={styles.container}>
        {/* Recording indicator */}
        <View style={styles.indicatorHeader}>
          <View style={styles.redDotPulse}>
            <View style={styles.redDot} />
          </View>
          <Text style={styles.recordingLabel}>녹음 중</Text>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Ionicons name="people" size={40} color="#FFFFFF" />
          <Text style={styles.partnerText}>
            {partnerName}님이 녹음하고 있습니다
          </Text>
          <Text style={styles.timerText}>{formatDuration(elapsed)}</Text>
        </View>

        {/* Stop button */}
        <Pressable style={styles.stopButton} onPress={onStop}>
          <Ionicons name="stop" size={28} color="#FFFFFF" />
          <Text style={styles.stopButtonText}>녹음 중지</Text>
        </Pressable>

        <Text style={styles.hintText}>
          버튼을 누르면 양쪽 모두 녹음이 중지됩니다
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(127, 29, 29, 0.95)',
    zIndex: 100,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  indicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  redDotPulse: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  recordingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FCA5A5',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  infoSection: {
    alignItems: 'center',
    gap: 12,
  },
  partnerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '300',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 16,
  },
  stopButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hintText: {
    fontSize: 13,
    color: '#FCA5A5',
    textAlign: 'center',
    marginTop: 8,
  },
});
