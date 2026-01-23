import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { usePartner } from '@/hooks/usePartner';
import DualConsentPrompt from '@/components/consent/DualConsentPrompt';

/**
 * Home screen with main app functionality
 */
export default function Home(): React.ReactElement {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { couple, connectionStatus } = usePartner();
  const [showConsentModal, setShowConsentModal] = useState(false);

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
    setShowConsentModal(true);
  };

  // Handle consent approved
  const handleConsentApproved = () => {
    setShowConsentModal(false);
    // Show placeholder message for Phase 3
    Alert.alert(
      '동의 완료',
      '녹음 기능은 Phase 3에서 구현됩니다.',
      [{ text: '확인' }]
    );
  };

  // Handle consent declined
  const handleConsentDeclined = () => {
    setShowConsentModal(false);
    Alert.alert(
      '녹음 취소',
      '녹음을 시작하려면 양측 동의가 필요합니다.',
      [{ text: '확인' }]
    );
  };

  // Handle emotion record button (Phase 2 placeholder)
  const handleEmotionRecordPress = () => {
    Alert.alert(
      '준비 중',
      '감정 기록 기능은 Phase 2에서 구현됩니다.',
      [{ text: '확인' }]
    );
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
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

        {/* Partner status card */}
        {hasPartner ? (
          <View style={styles.partnerCard}>
            <View style={styles.partnerInfo}>
              <View style={styles.onlineIndicator} />
              <Text style={styles.partnerLabel}>연결된 파트너</Text>
            </View>
            <Text style={styles.partnerEmail}>{couple?.partner?.email}</Text>
          </View>
        ) : (
          <Pressable
            style={styles.connectCard}
            onPress={() => router.push('/onboarding/partner-link')}
          >
            <Text style={styles.connectTitle}>파트너와 연결하세요</Text>
            <Text style={styles.connectDescription}>
              함께 사용하면 더 많은 기능을 이용할 수 있어요
            </Text>
            <View style={styles.connectButton}>
              <Text style={styles.connectButtonText}>파트너 연결하기</Text>
            </View>
          </Pressable>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>빠른 시작</Text>

        {/* Emotion record card */}
        <Pressable style={styles.actionCard} onPress={handleEmotionRecordPress}>
          <Text style={styles.cardIcon}>📝</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>감정 기록하기</Text>
            <Text style={styles.cardDescription}>오늘의 감정과 상황을 기록해보세요</Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </Pressable>

        {/* Conflict recording card */}
        <Pressable
          style={[styles.actionCard, styles.conflictCard, !hasPartner && styles.disabledCard]}
          onPress={handleRecordPress}
        >
          <Text style={styles.cardIcon}>🎙️</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>갈등 녹음</Text>
            <Text style={styles.cardDescription}>
              {hasPartner
                ? '대화를 녹음하고 AI 분석을 받아보세요'
                : '파트너 연결 필요'}
            </Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </Pressable>

        {/* Insights card (placeholder) */}
        <Pressable
          style={[styles.actionCard, styles.insightsCard]}
          onPress={() => Alert.alert('준비 중', '인사이트 기능은 Phase 2에서 구현됩니다.')}
        >
          <Text style={styles.cardIcon}>✨</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>인사이트</Text>
            <Text style={styles.cardDescription}>파트너의 관점을 이해해보세요</Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </Pressable>
      </ScrollView>

      {/* Dual consent modal */}
      <DualConsentPrompt
        visible={showConsentModal}
        onConsent={handleConsentApproved}
        onDecline={handleConsentDeclined}
        onClose={() => setShowConsentModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
    marginHorizontal: -16,
    marginTop: -16,
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
  partnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  partnerLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  partnerEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  connectCard: {
    backgroundColor: '#4B5563',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  connectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  connectDescription: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 16,
  },
  connectButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  conflictCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  insightsCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  disabledCard: {
    opacity: 0.6,
  },
  cardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardArrow: {
    fontSize: 20,
    color: '#9CA3AF',
    marginLeft: 8,
  },
});
