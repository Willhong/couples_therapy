/**
 * RecordingControls component
 * Record/stop/cancel buttons with timer display
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Play, Pause, Bookmark } from 'lucide-react-native';
import { colors, alpha } from '@/theme';
import { BookmarkButton } from './BookmarkButton';

interface Props {
  isRecording: boolean;
  isPaused?: boolean;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onBookmark?: () => void;
  duration: number;
  bookmarkCount?: number;
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
  isPaused = false,
  onStart,
  onStop,
  onCancel,
  onPause = () => {},
  onResume = () => {},
  onBookmark = () => {},
  duration,
  bookmarkCount = 0,
}: Props): React.ReactElement {
  return (
    <View style={styles.container}>
      {/* Timer */}
      <Text style={[styles.timer, isRecording && styles.timerActive, isPaused && styles.timerPaused]}>
        {formatDuration(duration)}
      </Text>

      {/* Button row */}
      <View style={styles.buttonRow}>
        {isRecording ? (
          <>
            {/* Pause/Resume button */}
            <Pressable
              style={styles.sideButton}
              onPress={isPaused ? onResume : onPause}
              hitSlop={12}
            >
              {isPaused ? <Play size={24} color={colors.white} /> : <Pause size={24} color={colors.white} />}
            </Pressable>

            {/* Stop button */}
            <Pressable
              style={styles.stopButton}
              onPress={onStop}
              hitSlop={8}
            >
              <View style={styles.stopIcon} />
            </Pressable>

            {/* Bookmark button */}
            <Pressable
              style={styles.sideButton}
              onPress={onBookmark}
              hitSlop={12}
            >
              <Bookmark size={24} color={colors.white} />
              {bookmarkCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{bookmarkCount}</Text>
                </View>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.placeholderButton} />

            {/* Main record button */}
            <Pressable
              style={styles.recordButton}
              onPress={onStart}
              hitSlop={8}
            >
              <View style={styles.recordIcon} />
            </Pressable>

            <View style={styles.placeholderButton} />
          </>
        )}
      </View>

      {/* Hint text */}
      <Text style={styles.hint}>
        {isPaused ? '일시정지 중' : isRecording ? '탭하여 녹음 중지' : '탭하여 녹음 시작'}
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
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
    marginBottom: 32,
  },
  timerActive: {
    color: colors.gray800,
  },
  timerPaused: {
    color: colors.accentWarm,
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
    backgroundColor: colors.bgAiMessage,
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
    borderColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.error,
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  sideButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: alpha(colors.white, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.accentWarm,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  hint: {
    fontSize: 14,
    color: colors.textTertiary,
  },
});
