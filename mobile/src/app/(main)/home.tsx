import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { usePartner } from '@/hooks/usePartner';
import { LiveConsentFlow } from '@/features/recording/components/LiveConsentFlow';
import { ConversationList } from '@/features/conversations';
import { DailyPromptCard } from '@/features/prompts';
import { StreakCard, CheckInSection } from '@/features/checkin';
import { ActivitiesSection } from '@/features/activities';
import { InsightsPreviewCard } from '@/features/insights/components/InsightsPreviewCard';
import { api } from '@/lib/api';
import type { RecordingMode, TranscriptResult } from '@/features/recording/types';
import { colors, alpha } from '@/theme';
import { headingFont } from '@/theme/typography';

/**
 * Home screen - unified conversation list with quick action buttons.
 */
export default function Home(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const { couple, connectionStatus } = usePartner();
  const [showLiveConsent, setShowLiveConsent] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [streakKey, setStreakKey] = useState(0);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Couple avatar */}
          <View style={styles.coupleAvatar}>
            <View style={styles.avatarCircleWarm} />
            <View style={styles.avatarCircleSage} />
          </View>
          <View>
            <Text style={styles.greeting}>좋은 아침이에요</Text>
            <Text style={styles.name}>
              {hasPartner
                ? `${displayName} & ${couple?.partner?.email?.split('@')[0] || '파트너'}`
                : displayName}
            </Text>
          </View>
        </View>
        <Pressable style={styles.bellButton}>
          <Bell size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Card */}
        <StreakCard key={streakKey} />

        {/* Daily Check-in */}
        <CheckInSection onCheckInComplete={() => setStreakKey((k) => k + 1)} />

        {/* Couple Activities */}
        {hasPartner && <ActivitiesSection />}

        {/* Weekly Insights Preview */}
        {hasPartner && <InsightsPreviewCard />}

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
          <ConversationList nested />
        </View>
      </ScrollView>

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
    backgroundColor: colors.bgPage,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coupleAvatar: {
    width: 48,
    height: 48,
    position: 'relative',
  },
  avatarCircleWarm: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentWarm,
    position: 'absolute',
    left: 0,
    top: 16,
  },
  avatarCircleSage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSage,
    position: 'absolute',
    left: 16,
    top: 0,
  },
  greeting: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  name: {
    fontFamily: headingFont,
    fontSize: 18,
    color: colors.textPrimary,
  },
  bellButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    gap: 24,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  listContainer: {
    minHeight: 200,
  },
  sectionTitle: {
    fontFamily: headingFont,
    fontSize: 20,
    color: colors.textPrimary,
    paddingBottom: 8,
  },
  partnerInviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.warningBg,
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
    color: colors.warning,
    marginBottom: 2,
  },
  partnerInviteSubtitle: {
    fontSize: 13,
    color: colors.warning,
  },
  partnerInviteArrow: {
    fontSize: 24,
    color: colors.warning,
    marginLeft: 8,
  },
  partnerConnectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.successBg,
  },
  partnerConnectedIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: 12,
  },
  partnerConnectedContent: {
    flex: 1,
  },
  partnerConnectedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 2,
  },
  partnerConnectedEmail: {
    fontSize: 14,
    color: colors.success,
  },
  sharedNotificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primaryLight,
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
    color: colors.primary,
    marginBottom: 2,
  },
  sharedNotificationSubtitle: {
    fontSize: 13,
    color: colors.primary,
  },
  sharedBadge: {
    backgroundColor: colors.primary,
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
    color: colors.white,
  },
});
