/**
 * TranscriptLine component
 * Chat-bubble style transcript segment display
 * Right-aligned (blue) for current user, left-aligned (gray) for other speaker
 * Emotion intensity: subtle left border color
 * Press to jump to audio, long press to trigger edit
 */
import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { TranscriptSegment } from '@/features/recording/types';
import type { SpeakerMap } from '../types';

interface Props {
  segment: TranscriptSegment;
  speakerMap: SpeakerMap;
  isCurrentlyPlaying: boolean;
  isNarration: boolean;
  onPress: (segment: TranscriptSegment) => void;
  onLongPress: (segment: TranscriptSegment) => void;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getEmotionBorderColor(intensity: number | null): string {
  if (intensity === null || intensity === undefined) return 'transparent';
  if (intensity >= 0.7) return '#EF4444'; // high - red
  if (intensity >= 0.4) return '#F59E0B'; // medium - amber
  return '#10B981'; // low - green
}

function TranscriptLineComponent({
  segment,
  speakerMap,
  isCurrentlyPlaying,
  isNarration,
  onPress,
  onLongPress,
}: Props): React.ReactElement {
  // For narration mode, all segments are on the left (single speaker)
  // For live mode, first speaker is right (user), others are left
  const isUserSpeaker = !isNarration && segment.speaker === 'SPEAKER_00';

  const handlePress = useCallback(() => {
    onPress(segment);
  }, [segment, onPress]);

  const handleLongPress = useCallback(() => {
    onLongPress(segment);
  }, [segment, onLongPress]);

  const speakerName =
    speakerMap[segment.speaker] || segment.speaker_label || segment.speaker;

  const emotionBorderColor = getEmotionBorderColor(segment.emotion_intensity);

  return (
    <View
      style={[
        styles.container,
        isUserSpeaker ? styles.containerRight : styles.containerLeft,
      ]}
    >
      {/* Speaker label */}
      {!isNarration && (
        <Text style={styles.speakerLabel}>{speakerName}</Text>
      )}

      {/* Bubble */}
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [
          styles.bubble,
          isUserSpeaker ? styles.bubbleUser : styles.bubbleOther,
          isCurrentlyPlaying && styles.bubblePlaying,
          pressed && styles.bubblePressed,
          emotionBorderColor !== 'transparent' && {
            borderLeftWidth: 3,
            borderLeftColor: emotionBorderColor,
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            isUserSpeaker ? styles.textUser : styles.textOther,
          ]}
        >
          {segment.text}
        </Text>
      </Pressable>

      {/* Timestamp */}
      <Text
        style={[
          styles.timestamp,
          isUserSpeaker ? styles.timestampRight : styles.timestampLeft,
        ]}
      >
        {formatTimestamp(segment.start_time)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 12,
    maxWidth: '80%',
  },
  containerLeft: {
    alignSelf: 'flex-start',
  },
  containerRight: {
    alignSelf: 'flex-end',
  },
  speakerLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#6B7FD7',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubblePlaying: {
    borderWidth: 2,
    borderColor: '#6B7FD7',
    backgroundColor: '#EEF2FF',
  },
  bubblePressed: {
    opacity: 0.7,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  textUser: {
    color: '#FFFFFF',
  },
  textOther: {
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 3,
  },
  timestampLeft: {
    marginLeft: 4,
  },
  timestampRight: {
    textAlign: 'right',
    marginRight: 4,
  },
});

export const TranscriptLine = memo(TranscriptLineComponent);
