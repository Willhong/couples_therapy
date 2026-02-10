/**
 * Transcript detail route page
 * Dynamic route: /transcript/{recordingId}
 * Renders TranscriptView with mode-aware post-actions
 */
import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { TranscriptView } from '@/features/transcript/components/TranscriptView';
import type { PostTranscriptAction } from '@/features/recording/types';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

export default function TranscriptDetailScreen(): React.ReactElement {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();

  const handleActionComplete = useCallback(
    (action: PostTranscriptAction) => {
      if (action === 'keep') {
        // Go back to home
        router.replace('/(main)/home');
      } else if (action === 'reframe') {
        // Navigate to chat for reframing
        router.replace('/(main)/chat');
      } else if (action === 'comfort') {
        // Navigate to chat for comfort
        router.replace('/(main)/chat');
      }
    },
    [router]
  );

  const handleGoBack = useCallback(() => {
    // If came from post-recording-choice, go back there with recordingId preserved
    if (from === 'post-recording-choice' && id) {
      router.replace({
        pathname: '/(main)/post-recording-choice',
        params: { recordingId: id },
      });
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(main)/home');
    }
  }, [router, from, id]);

  if (!id) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>잘못된 접근입니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.gray800} />
        </Pressable>
        <Text style={styles.headerTitle}>전사 결과</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Transcript content */}
      <TranscriptView
        recordingId={id}
        onActionComplete={handleActionComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: headingFont,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
  },
});
