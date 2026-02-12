/**
 * VoiceInputButton component
 * Tap-to-start, tap-to-stop voice recording with transcription
 */
import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Mic } from 'lucide-react-native';
import { colors } from '@/theme';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface Props {
  onTranscript?: (text: string) => void;
}

export function VoiceInputButton({ onTranscript }: Props): React.ReactElement {
  const { state, startRecording, stopRecording } = useVoiceInput();

  const handlePress = async () => {
    if (state === 'recording') {
      const text = await stopRecording();
      if (text && onTranscript) {
        onTranscript(text);
      }
    } else if (state === 'idle') {
      await startRecording();
    }
    // Do nothing if processing
  };

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <Pressable
      style={[
        styles.button,
        isRecording && styles.buttonRecording,
        isProcessing && styles.buttonProcessing,
      ]}
      onPress={handlePress}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : (
        <>
          {isRecording && <View style={styles.recordingDot} />}
          <Mic size={14} color={isRecording ? colors.white : colors.textSecondary} />
        </>
      )}
      <Text style={[styles.label, isRecording && styles.labelRecording, isProcessing && styles.labelProcessing]}>
        {isProcessing ? '변환 중' : isRecording ? '녹음 중' : '음성'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.chipBg,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  buttonRecording: {
    backgroundColor: '#E57373',
  },
  buttonProcessing: {
    backgroundColor: colors.primary,
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  labelRecording: {
    color: colors.white,
  },
  labelProcessing: {
    color: colors.white,
  },
});
