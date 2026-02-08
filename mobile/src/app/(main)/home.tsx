import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { usePartner } from '@/hooks/usePartner';
import { LiveConsentFlow } from '@/features/recording/components/LiveConsentFlow';
import { ConversationList } from '@/features/conversations';
import type { RecordingMode, TranscriptResult } from '@/features/recording/types';

/**
 * Home screen - unified conversation list with quick action buttons.
 */
export default function Home(): React.ReactElement {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { couple, connectionStatus } = usePartner();
  const [showLiveConsent, setShowLiveConsent] = useState(false);

  // Get display name from email
  const displayName = user?.email?.split('@')[0] || '사용자';

  // Check if partner is connected
  const hasPartner = connectionStatus === 'active' && couple?.partner;

  // Handle recording button press
  const handleRecordPress = () => {
    if (!hasPartner) {
      Alert.alert(
        '파트너 연결 필요',
        '녹음을 시작하려면 파트너와 연결해야 합니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '연결하기',
            onPress: () => router.push('/onboarding/partner-link'),
          },
        ]
      );
      return;
    }
    setShowLiveConsent(true);
  };

  // Handle transcription complete from LiveConsentFlow
  const handleTranscriptionComplete = useCallback(
    (recordingId: string, mode: RecordingMode, _result: TranscriptResult) => {
      setShowLiveConsent(false);
      if (mode === 'narration') {
        router.push({
          pathname: '/(main)/post-recording-choice',
          params: { recordingId },
        });
      } else {
        router.push({
          pathname: '/(main)/transcript/[id]',
          params: { id: recordingId },
        });
      }
    },
    [router]
  );

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>안녕하세요,</Text>
          <Text style={styles.name}>{displayName}님</Text>
        </View>
        <Pressable style={styles.settingsButton} onPress={handleSignOut}>
          <Text style={styles.settingsText}>로그아웃</Text>
        </Pressable>
      </View>

      {/* Quick action buttons */}
      <View style={styles.actionRow}>
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push('/(main)/chat')}
        >
          <Text style={styles.actionIcon}>{'>'}</Text>
          <Text style={styles.actionLabel}>텍스트 대화</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, !hasPartner && styles.disabledButton]}
          onPress={handleRecordPress}
        >
          <Text style={styles.actionIcon}>{'O'}</Text>
          <Text style={styles.actionLabel}>갈등 녹음</Text>
        </Pressable>
      </View>

      {/* Unified conversation list */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>최근 대화</Text>
        <ConversationList />
      </View>

      {/* Live consent flow overlay */}
      {showLiveConsent && (
        <View style={StyleSheet.absoluteFill}>
          <LiveConsentFlow
            onTranscriptionComplete={handleTranscriptionComplete}
            onFallbackToNarration={() => {
              setShowLiveConsent(false);
              router.push('/(main)/record');
            }}
            onCancel={() => setShowLiveConsent(false)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  settingsButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  settingsText: {
    fontSize: 14,
    color: '#4B5563',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#6B7FD7',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  listContainer: {
    flex: 1,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
