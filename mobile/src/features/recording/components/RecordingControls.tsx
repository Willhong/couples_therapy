/**
 * RecordingControls component
 * Record/stop/cancel buttons with timer display
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  duration: number;
}

/**
 * Format seconds to MM:SS display
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function RecordingControls({
  isRecording,
  onStart,
  onStop,
  onCancel,
  duration,
}: Props): React.ReactElement {
  return (
    <View style={styles.container}>
      {/* Timer */}
      <Text style={[styles.timer, isRecording && styles.timerActive]}>
        {formatDuration(duration)}
      </Text>

      {/* Button row */}
      <View style={styles.buttonRow}>
        {/* Cancel button - visible only when recording */}
        {isRecording ? (
          <Pressable
            style={styles.cancelButton}
            onPress={onCancel}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color="#6B7280" />
          </Pressable>
        ) : (
          <View style={styles.placeholderButton} />
        )}

        {/* Main record/stop button */}
        {isRecording ? (
          <Pressable
            style={styles.stopButton}
            onPress={onStop}
            hitSlop={8}
          >
            <View style={styles.stopIcon} />
          </Pressable>
        ) : (
          <Pressable
            style={styles.recordButton}
            onPress={onStart}
            hitSlop={8}
          >
            <View style={styles.recordIcon} />
          </Pressable>
        )}

        {/* Spacer for symmetry */}
        <View style={styles.placeholderButton} />
      </View>

      {/* Hint text */}
      <Text style={styles.hint}>
        {isRecording ? '탭하여 녹음 중지' : '탭하여 녹음 시작'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  timer: {
    fontSize: 48,
    fontWeight: '300',
    color: '#9CA3AF',
    fontVariant: ['tabular-nums'],
    marginBottom: 32,
  },
  timerActive: {
    color: '#1F2937',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 16,
  },
  cancelButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderButton: {
    width: 48,
    height: 48,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  hint: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
