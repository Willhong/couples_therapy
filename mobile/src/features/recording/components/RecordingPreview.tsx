/**
 * RecordingPreview component
 * Audio playback with submit/re-record/cancel actions
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Play, Pause, RefreshCw, Upload } from 'lucide-react-native';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

interface Props {
  uri: string;
  duration: number;
  onSubmit: () => void;
  onReRecord: () => void;
  onCancel: () => void;
}

/**
 * Format seconds to MM:SS display
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function RecordingPreview({
  uri,
  duration,
  onSubmit,
  onReRecord,
  onCancel,
}: Props): React.ReactElement {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [soundDuration, setSoundDuration] = useState(duration);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Load sound on mount
  useEffect(() => {
    let mounted = true;

    async function loadSound() {
      try {
        setIsLoading(true);
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false },
          (status: AVPlaybackStatus) => {
            if (!mounted || !status.isLoaded) return;
            setPosition(Math.floor((status.positionMillis || 0) / 1000));
            if (status.durationMillis) {
              setSoundDuration(Math.floor(status.durationMillis / 1000));
            }
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          }
        );
        soundRef.current = sound;
      } catch (error) {
        console.error('Failed to load sound:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadSound();

    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, [uri]);

  /**
   * Toggle play/pause
   */
  const togglePlayback = useCallback(async () => {
    if (!soundRef.current) return;

    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.positionMillis === status.durationMillis) {
        await soundRef.current.setPositionAsync(0);
      }
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const progress = soundDuration > 0 ? position / soundDuration : 0;

  return (
    <View style={styles.container}>
      {/* Playback section */}
      <View style={styles.playbackSection}>
        <Text style={styles.title}>녹음 미리듣기</Text>

        {/* Play/Pause button */}
        <Pressable
          style={styles.playButton}
          onPress={togglePlayback}
          disabled={isLoading}
          hitSlop={8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            isPlaying ? <Pause size={32} color={colors.primary} /> : <Play size={32} color={colors.primary} />
          )}
        </Pressable>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatDuration(position)}</Text>
            <Text style={styles.timeText}>{formatDuration(soundDuration)}</Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryButton} onPress={onCancel}>
          <Text style={styles.secondaryButtonText}>취소</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={onReRecord}>
          <RefreshCw size={18} color={colors.textSecondary} />
          <Text style={styles.secondaryButtonText}>다시 녹음</Text>
        </Pressable>

        <Pressable style={styles.primaryButton} onPress={onSubmit}>
          <Upload size={18} color={colors.white} />
          <Text style={styles.primaryButtonText}>제출하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  playbackSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: headingFont,
    color: colors.textPrimary,
    marginBottom: 24,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.bgAiMessage,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
});
