/**
 * TranscriptLine component
 * Chat-bubble style transcript segment display
 * Right-aligned (blue) for current user, left-aligned (gray) for other speaker
 * Emotion intensity: subtle left border color
 * Press to jump to audio, long press to trigger edit
 */
import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import { TriggerHighlight } from '@/features/insights/components/TriggerHighlight';
import type { TranscriptSegment } from '@/features/recording/types';
import type { SpeakerMap } from '../types';

interface Props {
  segment: TranscriptSegment;
  speakerMap: SpeakerMap;
  isCurrentlyPlaying: boolean;
  isNarration: boolean;
  triggerPhrases?: string[];
  onPress: (segment: TranscriptSegment) => void;
  onLongPress: (segment: TranscriptSegment) => void;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getEmotionBorderColor(intensity: number | null): string {
  if (intensity === null || intensity === undefined) return colors.transparent;
  if (intensity >= 0.7) return colors.error; // high - red
  if (intensity >= 0.4) return colors.warningAmber; // medium - amber
  return colors.success; // low - green
}

function TranscriptLineComponent({
  segment,
  speakerMap,
  isCurrentlyPlaying,
  isNarration,
  triggerPhrases = [],
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
        {triggerPhrases.length > 0 && !isUserSpeaker ? (
          <TriggerHighlight
            text={segment.text}
            triggerPhrases={triggerPhrases}
            textStyle={[styles.text, styles.textOther]}
          />
        ) : (
          <Text
            style={[
              styles.text,
              isUserSpeaker ? styles.textUser : styles.textOther,
            ]}
          >
            {segment.text}
          </Text>
        )}
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
    color: colors.textSecondary,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.bgAiMessage,
    borderBottomLeftRadius: 4,
  },
  bubblePlaying: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  bubblePressed: {
    opacity: 0.7,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  textUser: {
    color: colors.white,
  },
  textOther: {
    color: colors.gray800,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textTertiary,
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
