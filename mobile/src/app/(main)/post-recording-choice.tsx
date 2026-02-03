/**
 * Post-recording choice screen for self-narration mode
 * Shows "reframe / comfort / keep" options BEFORE viewing transcript
 * Route params: { recordingId }
 */
import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PostTranscriptActions } from '@/features/transcript/components/PostTranscriptActions';
import { setPostAction } from '@/features/recording/services/audioApi';
import type { PostTranscriptAction } from '@/features/recording/types';

export default function PostRecordingChoiceScreen(): React.ReactElement {
  const { recordingId } = useLocalSearchParams<{ recordingId: string }>();
  const router = useRouter();

  const handleAction = useCallback(
    async (action: PostTranscriptAction) => {
      if (!recordingId) return;

      await setPostAction(recordingId, action);

      if (action === 'keep') {
        // Navigate to transcript view to see the result
        router.replace({
          pathname: '/(main)/transcript/[id]',
          params: { id: recordingId },
        });
      } else if (action === 'reframe') {
        // Go to chat for reframing, can view transcript later
        router.replace('/(main)/chat');
      } else if (action === 'comfort') {
        // Go to chat for comfort
        router.replace('/(main)/chat');
      }
    },
    [recordingId, router]
  );

  const handleViewTranscript = useCallback(() => {
    if (!recordingId) return;
    router.push({
      pathname: '/(main)/transcript/[id]',
      params: { id: recordingId, from: 'post-recording-choice' },
    });
  }, [recordingId, router]);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(main)/home');
    }
  }, [router]);

  if (!recordingId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>잘못된 접근입니다</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Success icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-circle" size={56} color="#10B981" />
        </View>

        <Text style={styles.title}>녹음이 완료되었어요</Text>
        <Text style={styles.subtitle}>
          음성이 텍스트로 변환되었습니다.{'\n'}어떻게 하시겠어요?
        </Text>

        {/* Action buttons */}
        <PostTranscriptActions mode="standalone" onAction={handleAction} />

        {/* View transcript link */}
        <Pressable
          style={styles.viewTranscriptLink}
          onPress={handleViewTranscript}
        >
          <Ionicons name="document-text-outline" size={18} color="#6B7FD7" />
          <Text style={styles.viewTranscriptText}>전사 결과 보기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  iconCircle: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  viewTranscriptLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 6,
    paddingVertical: 12,
  },
  viewTranscriptText: {
    fontSize: 15,
    color: '#6B7FD7',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
});
