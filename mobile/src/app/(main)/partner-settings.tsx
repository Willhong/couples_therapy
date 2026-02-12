/**
 * Partner Settings screen - manage partner connection
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Users, Copy, UserPlus } from 'lucide-react-native';
import { api } from '@/lib/api';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

interface CoupleStatus {
  is_in_couple: boolean;
  couple_id?: string;
  partner_email?: string;
}

export default function PartnerSettingsScreen(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [coupleStatus, setCoupleStatus] = useState<CoupleStatus | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get<CoupleStatus>('/couples/status/');
      setCoupleStatus(response.data);
    } catch {
      Alert.alert('오류', '상태를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      setActionLoading(true);
      const response = await api.post<{ invite_code: string }>('/couples/invite/generate/');
      setInviteCode(response.data.invite_code);
    } catch {
      Alert.alert('오류', '초대 코드를 생성할 수 없습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!joinCode.trim()) {
      Alert.alert('오류', '초대 코드를 입력해주세요.');
      return;
    }
    try {
      setActionLoading(true);
      await api.post('/couples/invite/redeem/', { invite_code: joinCode.trim() });
      Alert.alert('성공', '파트너와 연결되었습니다!', [
        { text: '확인', onPress: () => loadStatus() },
      ]);
    } catch {
      Alert.alert('오류', '유효하지 않은 초대 코드입니다.');
    } finally {
      setActionLoading(false);
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
        <Text style={styles.headerTitle}>파트너 연결</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {coupleStatus?.is_in_couple ? (
          /* Connected State */
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <Users size={24} color={colors.primary} />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>파트너와 연결됨</Text>
                <Text style={styles.statusEmail}>{coupleStatus.partner_email}</Text>
              </View>
            </View>
          </View>
        ) : (
          /* Not Connected State */
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>초대 코드 생성</Text>
              <Text style={styles.cardDescription}>
                파트너에게 공유할 초대 코드를 생성하세요
              </Text>
              {inviteCode ? (
                <View style={styles.codeContainer}>
                  <Text style={styles.codeText}>{inviteCode}</Text>
                  <Pressable style={styles.copyButton}>
                    <Copy size={16} color={colors.primary} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.actionButton}
                  onPress={handleGenerateInvite}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.actionButtonText}>초대 코드 생성</Text>
                  )}
                </Pressable>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>초대 코드 입력</Text>
              <Text style={styles.cardDescription}>
                파트너에게 받은 초대 코드를 입력하세요
              </Text>
              <TextInput
                style={styles.codeInput}
                placeholder="초대 코드 입력"
                placeholderTextColor={colors.textTertiary}
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="none"
              />
              <Pressable
                style={styles.actionButton}
                onPress={handleJoinWithCode}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <UserPlus size={16} color={colors.white} />
                    <Text style={styles.actionButtonText}>연결하기</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
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
    backgroundColor: colors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  cardDescription: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  statusEmail: { fontSize: 14, color: colors.textSecondary },
  codeContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F0',
    borderRadius: 12, padding: 16, gap: 12,
  },
  codeText: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, letterSpacing: 2 },
  copyButton: { padding: 8 },
  codeInput: {
    backgroundColor: '#F5F5F0', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 12, fontSize: 16, color: colors.textPrimary,
  },
  actionButton: {
    flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  actionButtonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
