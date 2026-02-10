import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePartner } from '@/hooks/usePartner';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

/**
 * Welcome screen shown to partners who join via invite link
 * Displays inviter's name and brief app explanation
 */
export default function PartnerWelcomeScreen(): React.ReactElement {
  const router = useRouter();
  const { couple } = usePartner();

  // Get partner name from couple data (the other person who invited)
  const inviterEmail = couple?.partner?.email || '파트너';
  const inviterName = inviterEmail.split('@')[0];

  const handleStart = () => {
    // Navigate to main app (home screen)
    router.replace('/(main)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Welcome Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🎉</Text>
        </View>

        {/* Welcome Message */}
        <Text style={styles.title}>환영합니다!</Text>
        <Text style={styles.subtitle}>
          {inviterName}님이 초대했습니다
        </Text>

        {/* App Explanation */}
        <View style={styles.explanationCard}>
          <Text style={styles.explanationTitle}>CouplesAI란?</Text>
          <Text style={styles.explanationText}>
            커플을 위한 AI 대화 도우미입니다.{'\n\n'}
            • 갈등 상황을 녹음하고 분석해요{'\n'}
            • AI가 감정을 이해하고 조언을 제공해요{'\n'}
            • 파트너와 함께 대화 내용을 공유해요{'\n'}
            • 관계 개선을 위한 인사이트를 받아요
          </Text>
        </View>

        {/* Start Button */}
        <Pressable style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>시작하기</Text>
        </Pressable>

        {/* Additional Info */}
        <Text style={styles.footerText}>
          모든 대화는 안전하게 보호됩니다
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.bgAiMessage,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: headingFont,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  explanationCard: {
    backgroundColor: colors.bgPage,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: headingFont,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 15,
    color: colors.gray600,
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  startButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
