/**
 * Notification Settings screen - toggle notification preferences
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { api } from '@/lib/api';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

interface NotificationPrefs {
  push_enabled: boolean;
  daily_prompt_enabled: boolean;
  partner_activity_enabled: boolean;
  weekly_insights_enabled: boolean;
}

const PREF_LABELS: Record<keyof NotificationPrefs, { title: string; description: string }> = {
  push_enabled: { title: '푸시 알림', description: '모든 알림을 켜거나 끕니다' },
  daily_prompt_enabled: { title: '매일 질문', description: '매일 새로운 대화 주제를 받습니다' },
  partner_activity_enabled: { title: '파트너 활동', description: '파트너의 활동 알림을 받습니다' },
  weekly_insights_enabled: { title: '주간 인사이트', description: '주간 관계 분석 리포트를 받습니다' },
};

export default function NotificationSettingsScreen(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      setLoading(true);
      const response = await api.get<NotificationPrefs>('/users/me/notification-preferences/');
      setPrefs(response.data);
    } catch {
      Alert.alert('오류', '알림 설정을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      await api.patch('/users/me/notification-preferences/', { [key]: value });
    } catch {
      // Revert on failure
      setPrefs(prefs);
      Alert.alert('오류', '설정을 변경할 수 없습니다.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>알림 설정</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {prefs && (Object.keys(PREF_LABELS) as Array<keyof NotificationPrefs>).map((key, index, arr) => (
            <React.Fragment key={key}>
              <View style={styles.prefItem}>
                <View style={styles.prefText}>
                  <Text style={styles.prefTitle}>{PREF_LABELS[key].title}</Text>
                  <Text style={styles.prefDescription}>{PREF_LABELS[key].description}</Text>
                </View>
                <Switch
                  value={prefs[key]}
                  onValueChange={(value) => handleToggle(key, value)}
                  trackColor={{ false: '#E8E4DF', true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
              {index < arr.length - 1 && <View style={styles.separator} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPage },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 24,
  },
  backButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: headingFont, color: colors.textPrimary },
  headerSpacer: { width: 44, height: 44 },
  content: { gap: 16, paddingVertical: 16, paddingHorizontal: 24, paddingBottom: 32 },
  card: {
    backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
  },
  prefItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16,
  },
  prefText: { flex: 1 },
  prefTitle: { fontSize: 15, fontWeight: '500', color: colors.textPrimary, marginBottom: 2 },
  prefDescription: { fontSize: 13, color: colors.textSecondary },
  separator: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
});
