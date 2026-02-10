import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { colors } from '@/theme';

interface HotlineItem {
  name: string;
  number: string;
}

const HOTLINES: HotlineItem[] = [
  { name: '자살예방상담전화', number: '1393' },
  { name: '정신건강위기상담전화', number: '1577-0199' },
  { name: '여성긴급전화', number: '1366' },
  { name: '경찰', number: '112' },
];

interface CrisisResponseCardProps {
  crisisType?: string;
  message: string;
}

export default function CrisisResponseCard({ crisisType, message }: CrisisResponseCardProps) {
  const handleCallHotline = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🚨</Text>
        <Text style={styles.headerText}>긴급 지원</Text>
      </View>

      <Text style={styles.message}>{message}</Text>

      <View style={styles.hotlinesContainer}>
        <Text style={styles.hotlinesTitle}>24시간 전문 상담 연결:</Text>
        {HOTLINES.map((hotline, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.hotlineButton,
              pressed && styles.hotlineButtonPressed,
            ]}
            onPress={() => handleCallHotline(hotline.number)}
          >
            <View style={styles.hotlineContent}>
              <Text style={styles.hotlineName}>{hotline.name}</Text>
              <Text style={styles.hotlineNumber}>{hotline.number}</Text>
            </View>
            <Text style={styles.phoneIcon}>📞</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>당신은 혼자가 아닙니다</Text>
        <Text style={styles.footerSubtext}>도움을 받을 수 있습니다</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.errorBg,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: colors.error,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dangerText,
  },
  message: {
    fontSize: 16,
    color: colors.dangerTextDark,
    marginBottom: 16,
    lineHeight: 24,
  },
  hotlinesContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  hotlinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dangerText,
    marginBottom: 12,
  },
  hotlineButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgAiMessage,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hotlineButtonPressed: {
    backgroundColor: colors.border,
  },
  hotlineContent: {
    flex: 1,
  },
  hotlineName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 2,
  },
  hotlineNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.error,
  },
  phoneIcon: {
    fontSize: 24,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.error,
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dangerText,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: colors.dangerText,
  },
});
