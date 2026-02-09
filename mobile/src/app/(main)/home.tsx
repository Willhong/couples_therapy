import React, { useState, useCallback, useEffect } from 'react';
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
import { DailyPromptCard } from '@/features/prompts';
import { api } from '@/lib/api';
import type { RecordingMode, TranscriptResult } from '@/features/recording/types';

/**
 * Home screen - unified conversation list with quick action buttons.
 */
export default function Home(): React.ReactElement {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { couple, connectionStatus } = usePartner();
  const [showLiveConsent, setShowLiveConsent] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Get display name from email
  const displayName = user?.email?.split('@')[0] || '사용자';

  // Check if partner is connected
  const hasPartner = connectionStatus === 'active' && couple?.partner;

  // Load unread shared content count
  useEffect(() => {
    if (!hasPartner) return;

    const loadUnreadCount = async () => {
      try {
        const response = await api.get<{ count: number }>('/chat/shared/unread-count/');
        setUnreadCount(response.data.count);
      } catch (error) {
        // Silently fail - not critical
        console.error('Failed to load unread count:', error);
      }
    };

    loadUnreadCount();

    // Poll every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [hasPartner]);

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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

      {/* Partner Status Card */}
      {!hasPartner ? (
        <Pressable
          style={styles.partnerInviteCard}
          onPress={() => router.push('/onboarding/partner-link')}
        >
          <View style={styles.partnerInviteContent}>
            <Text style={styles.partnerInviteIcon}>👥</Text>
            <View style={styles.partnerInviteText}>
              <Text style={styles.partnerInviteTitle}>파트너를 초대해보세요</Text>
              <Text style={styles.partnerInviteSubtitle}>
                함께 대화하고 관계를 개선해요
              </Text>
            </View>
          </View>
          <Text style={styles.partnerInviteArrow}>›</Text>
        </Pressable>
      ) : (
        <View style={styles.partnerConnectedCard}>
          <View style={styles.partnerConnectedIndicator} />
          <View style={styles.partnerConnectedContent}>
            <Text style={styles.partnerConnectedLabel}>연결됨</Text>
            <Text style={styles.partnerConnectedEmail}>
              {couple?.partner?.email || '파트너'}
            </Text>
          </View>
        </View>
      )}

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

      {/* Cool-down button */}
      <View style={styles.cooldownRow}>
        <Pressable
          style={styles.cooldownButton}
          onPress={() => router.push('/(main)/cooldown')}
        >
          <Text style={styles.cooldownIcon}>{'⏸'}</Text>
          <Text style={styles.cooldownLabel}>쿨다운</Text>
        </Pressable>
      </View>

      {/* Shared content notification */}
      {hasPartner && unreadCount > 0 && (
        <Pressable
          style={styles.sharedNotificationCard}
          onPress={() => router.push('/(main)/shared' as any)}
        >
          <View style={styles.sharedNotificationContent}>
            <Text style={styles.sharedNotificationIcon}>💬</Text>
            <View style={styles.sharedNotificationText}>
              <Text style={styles.sharedNotificationTitle}>
                파트너가 {unreadCount}개의 리프레이밍을 공유했습니다
              </Text>
              <Text style={styles.sharedNotificationSubtitle}>탭하여 확인하기</Text>
            </View>
          </View>
          <View style={styles.sharedBadge}>
            <Text style={styles.sharedBadgeText}>{unreadCount}</Text>
          </View>
        </Pressable>
      )}

      {/* Daily Prompt Card */}
      {hasPartner && <DailyPromptCard />}

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
  cooldownRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cooldownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(107, 127, 215, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#6B7FD7',
  },
  cooldownIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#6B7FD7',
  },
  cooldownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7FD7',
  },
  partnerInviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  partnerInviteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  partnerInviteIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  partnerInviteText: {
    flex: 1,
  },
  partnerInviteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  partnerInviteSubtitle: {
    fontSize: 13,
    color: '#78350F',
  },
  partnerInviteArrow: {
    fontSize: 24,
    color: '#92400E',
    marginLeft: 8,
  },
  partnerConnectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  partnerConnectedIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: 12,
  },
  partnerConnectedContent: {
    flex: 1,
  },
  partnerConnectedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 2,
  },
  partnerConnectedEmail: {
    fontSize: 14,
    color: '#047857',
  },
  sharedNotificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  sharedNotificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sharedNotificationIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  sharedNotificationText: {
    flex: 1,
  },
  sharedNotificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3730A3',
    marginBottom: 2,
  },
  sharedNotificationSubtitle: {
    fontSize: 13,
    color: '#4F46E5',
  },
  sharedBadge: {
    backgroundColor: '#6B7FD7',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  sharedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
