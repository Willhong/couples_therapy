/**
 * AudioPlayer component
 * Horizontal bar with play/pause, seekable progress bar, time display
 * Shows "audio unavailable" message when no audio is loaded
 */
import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { VolumeX, Play, Pause } from 'lucide-react-native';
import { colors } from '@/theme';

interface Props {
  isPlaying: boolean;
  isAvailable: boolean;
  position: number; // ms
  duration: number; // ms
  onPlay: () => void;
  onPause: () => void;
  onSeek: (positionMs: number) => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer({
  isPlaying,
  isAvailable,
  position,
  duration,
  onPlay,
  onPause,
  onSeek,
}: Props): React.ReactElement {
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  }, [isPlaying, onPlay, onPause]);

  const handleSliderComplete = useCallback(
    (value: number) => {
      onSeek(value);
    },
    [onSeek]
  );

  if (!isAvailable) {
    return (
      <View style={styles.unavailableContainer}>
        <VolumeX size={18} color={colors.textTertiary} />
        <Text style={styles.unavailableText}>오디오 없음</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Play/Pause button */}
      <Pressable
        onPress={handleTogglePlay}
        style={({ pressed }) => [
          styles.playButton,
          pressed && styles.playButtonPressed,
        ]}
      >
        {isPlaying ? (
          <Pause size={22} color={colors.white} />
        ) : (
          <Play size={22} color={colors.white} />
        )}
      </Pressable>

      {/* Progress bar */}
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          value={position}
          minimumValue={0}
          maximumValue={duration || 1}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
          onSlidingComplete={handleSliderComplete}
        />
      </View>

      {/* Time display */}
      <Text style={styles.time}>
        {formatTime(position)} / {formatTime(duration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgPage,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonPressed: {
    opacity: 0.7,
  },
  sliderContainer: {
    flex: 1,
  },
  slider: {
    width: '100%',
    height: 32,
  },
  time: {
    fontSize: 12,
    color: colors.textSecondary,
    minWidth: 80,
    textAlign: 'right',
  },
  unavailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.bgPage,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 6,
  },
  unavailableText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
});
