import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { TokenStorage } from '@/lib/auth';

interface UserData {
  email: string;
}

interface CoupleStatus {
  is_in_couple: boolean;
  couple_id?: string;
  partner_email?: string;
}

/**
 * Settings screen with profile, legal links, data management, and logout
 */
export default function SettingsScreen(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [coupleStatus, setCoupleStatus] = useState<CoupleStatus | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userResponse, coupleResponse] = await Promise.all([
        api.get('/auth/user/'),
        api.get('/couples/status/')
      ]);
      setUserData(userResponse.data);
      setCoupleStatus(coupleResponse.data);
    } catch (error) {
      console.error('Failed to load user data:', error);
      Alert.alert('오류', '사용자 정보를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading('logout');
              await api.post('/auth/logout/');
              await TokenStorage.clearTokens();
              router.replace('/(auth)/sign-in');
            } catch (error) {
              console.error('Logout failed:', error);
              Alert.alert('오류', '로그아웃에 실패했습니다');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleDataExport = async () => {
    Alert.alert(
      '데이터 내보내기',
      '내 데이터를 내보내시겠습니까? 이메일로 데이터가 전송됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '내보내기',
          onPress: async () => {
            try {
              setActionLoading('export');
              await api.post('/users/me/data-export/');
              Alert.alert('완료', '데이터 내보내기 요청이 완료되었습니다. 이메일을 확인해주세요.');
            } catch (error) {
              console.error('Data export failed:', error);
              Alert.alert('오류', '데이터 내보내기에 실패했습니다');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleAccountDeletion = async () => {
    Alert.alert(
      '계정 삭제',
      '정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading('delete');
              await api.delete('/users/me/');
              await TokenStorage.clearTokens();
              Alert.alert('완료', '계정이 삭제되었습니다', [
                { text: '확인', onPress: () => router.replace('/(auth)/sign-in') }
              ]);
            } catch (error) {
              console.error('Account deletion failed:', error);
              Alert.alert('오류', '계정 삭제에 실패했습니다');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>프로필</Text>
        <View style={styles.card}>
          <View style={styles.profileItem}>
            <Text style={styles.label}>이메일</Text>
            <Text style={styles.value}>{userData?.email || '정보 없음'}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.profileItem}>
            <Text style={styles.label}>커플 상태</Text>
            <Text style={styles.value}>
              {coupleStatus?.is_in_couple
                ? `연결됨 (${coupleStatus.partner_email})`
                : '연결되지 않음'}
            </Text>
          </View>
        </View>
      </View>

      {/* Legal Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>약관 및 정책</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(auth)/privacy-policy' as any)}
          >
            <Text style={styles.menuText}>개인정보 처리방침</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(auth)/terms' as any)}
          >
            <Text style={styles.menuText}>서비스 이용약관</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>데이터 관리</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleDataExport}
            disabled={actionLoading === 'export'}
          >
            <Text style={styles.menuText}>데이터 내보내기</Text>
            {actionLoading === 'export' ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Text style={styles.chevron}>›</Text>
            )}
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleAccountDeletion}
            disabled={actionLoading === 'delete'}
          >
            <Text style={[styles.menuText, styles.dangerText]}>계정 삭제</Text>
            {actionLoading === 'delete' ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text style={styles.chevron}>›</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>앱 정보</Text>
        <View style={styles.card}>
          <View style={styles.profileItem}>
            <Text style={styles.label}>버전</Text>
            <Text style={styles.value}>1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={actionLoading === 'logout'}
      >
        {actionLoading === 'logout' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.logoutText}>로그아웃</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  profileItem: {
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#1F2937',
  },
  dangerText: {
    color: '#EF4444',
  },
  chevron: {
    fontSize: 24,
    color: '#D1D5DB',
    fontWeight: '300',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  logoutButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
