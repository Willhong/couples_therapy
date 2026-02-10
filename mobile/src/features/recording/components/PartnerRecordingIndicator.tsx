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
import { Users, Square } from 'lucide-react-native';
import { colors, alpha } from '@/theme';

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
          <Users size={40} color={colors.white} />
          <Text style={styles.partnerText}>
            {partnerName}님이 녹음하고 있습니다
          </Text>
          <Text style={styles.timerText}>{formatDuration(elapsed)}</Text>
        </View>

        {/* Stop button */}
        <Pressable style={styles.stopButton} onPress={onStop}>
          <Square size={28} color={colors.white} />
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
    backgroundColor: alpha(colors.dangerTextDark, 0.95),
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
    backgroundColor: alpha(colors.error, 0.3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  recordingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.errorBg,
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
    color: colors.white,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '300',
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.error,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 16,
  },
  stopButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  hintText: {
    fontSize: 13,
    color: colors.errorBg,
    textAlign: 'center',
    marginTop: 8,
  },
});
