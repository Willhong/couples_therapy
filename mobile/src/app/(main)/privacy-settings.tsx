/**
 * Privacy & Security settings screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Download, Trash2, Shield } from 'lucide-react-native';
import { api } from '@/lib/api';
import { TokenStorage } from '@/lib/auth';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

export default function PrivacySettingsScreen(): React.ReactElement {
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleExportData = async () => {
    try {
      setExportLoading(true);
      const response = await api.get('/users/me/data-export/');
      Alert.alert(
        '데이터 내보내기 완료',
        '내 데이터가 성공적으로 조회되었습니다.\n\n' +
          `프로필: ${response.data.profile?.email || ''}\n` +
          `대화 수: ${response.data.conversations?.length || 0}개\n` +
          `커플 상태: ${response.data.couple_status?.status || '없음'}`,
      );
    } catch {
      Alert.alert('오류', '데이터를 내보낼 수 없습니다.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '최종 확인',
              '모든 데이터가 영구적으로 삭제됩니다. 정말 진행하시겠습니까?',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '영구 삭제',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setDeleteLoading(true);
                      await api.delete('/users/me/');
                      await TokenStorage.clearTokens();
                      router.replace('/(auth)/sign-in');
                    } catch {
                      Alert.alert('오류', '계정을 삭제할 수 없습니다.');
                      setDeleteLoading(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>개인정보 및 보안</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* PIPA Notice */}
        <View style={styles.noticeCard}>
          <Shield size={20} color={colors.primary} />
          <Text style={styles.noticeText}>
            개인정보보호법(PIPA)에 따라 귀하의 데이터에 대한 접근, 수정, 삭제 권리가 보장됩니다.
          </Text>
        </View>

        {/* Data Export */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>내 데이터 내보내기</Text>
          <Text style={styles.cardDescription}>
            프로필, 대화 목록, 커플 상태 등 개인 데이터를 조회합니다.
          </Text>
          <Pressable
            style={styles.actionButton}
            onPress={handleExportData}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Download size={16} color={colors.white} />
                <Text style={styles.actionButtonText}>데이터 내보내기</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Account Deletion */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>계정 삭제</Text>
          <Text style={styles.cardDescription}>
            계정과 모든 관련 데이터를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </Text>
          <Pressable
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <ActivityIndicator size="small" color="#E57373" />
            ) : (
              <>
                <Trash2 size={16} color="#E57373" />
                <Text style={styles.deleteButtonText}>계정 삭제</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
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
  noticeCard: {
    flexDirection: 'row', backgroundColor: colors.primaryLight, borderRadius: 12,
    padding: 16, gap: 12, alignItems: 'flex-start',
  },
  noticeText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 20 },
  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  cardDescription: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  actionButton: {
    flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  actionButtonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  deleteButton: {
    flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E57373',
  },
  deleteButtonText: { color: '#E57373', fontSize: 15, fontWeight: '600' },
});
