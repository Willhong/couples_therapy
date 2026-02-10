/**
 * Recording Preview route - preview and submit voice recordings
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RefreshCw, Upload } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, headingFont } from '@/theme';

export default function RecordingPreviewRoute(): React.ReactElement {
  const router = useRouter();
  const { recordingId } = useLocalSearchParams<{ recordingId?: string }>();
  const [isPlaying, setIsPlaying] = useState(false);

  const handleCancel = () => {
    router.back();
  };

  const handleReRecord = () => {
    // Navigate back to recording screen
    router.back();
  };

  const handleSubmit = () => {
    // Submit recording logic
    console.log('Submitting recording:', recordingId);
    router.back();
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {/* Playback Section */}
        <View style={styles.playbackSection}>
          <Text style={styles.title}>녹음 미리듣기</Text>

          <Pressable style={styles.playButton} onPress={togglePlayback}>
            {isPlaying ? (
              <Pause size={32} color={colors.primary} fill={colors.primary} />
            ) : (
              <Play size={32} color={colors.primary} fill={colors.primary} />
            )}
          </Pressable>

          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>1:23</Text>
              <Text style={styles.timeText}>4:56</Text>
            </View>
          </View>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <Pressable style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </Pressable>

          <Pressable style={styles.reRecordButton} onPress={handleReRecord}>
            <RefreshCw size={16} color="#5A5A5A" />
            <Text style={styles.reRecordButtonText}>다시 녹음</Text>
          </Pressable>

          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Upload size={16} color={colors.white} />
            <Text style={styles.submitButtonText}>제출하기</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 48,
  },
  playbackSection: {
    alignItems: 'center',
    gap: 24,
  },
  title: {
    fontFamily: headingFont,
    fontSize: 22,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    width: '100%',
    gap: 8,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressFill: {
    width: '30%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0EFEB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5A5A5A',
  },
  reRecordButton: {
    backgroundColor: '#F0EFEB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reRecordButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5A5A5A',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
