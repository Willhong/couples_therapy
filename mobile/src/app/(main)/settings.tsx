import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Linking, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Users, Bell, Lock, LifeBuoy, MessageSquare, FileText, Shield, Info, LogOut, ChevronRight } from 'lucide-react-native';
import { api } from '@/lib/api';
import { TokenStorage } from '@/lib/auth';
import { ProfileCard } from '@/features/settings/components/ProfileCard';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

interface UserData {
  email: string;
}

interface CoupleStatus {
  is_in_couple: boolean;
  couple_id?: string;
  partner_email?: string;
}

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
        <Text style={styles.headerTitle}>설정</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <ProfileCard email={userData?.email || ''} />

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>계정</Text>
          <View style={styles.card}>
            <Pressable style={styles.listItem}>
              <Users size={20} color={colors.textPrimary} />
              <Text style={styles.listItemText}>파트너 연결</Text>
              <ChevronRight size={20} color={colors.textTertiary} />
            </Pressable>
            <View style={styles.separator} />
            <Pressable style={styles.listItem}>
              <Bell size={20} color={colors.textPrimary} />
              <Text style={styles.listItemText}>알림</Text>
              <ChevronRight size={20} color={colors.textTertiary} />
            </Pressable>
            <View style={styles.separator} />
            <Pressable style={styles.listItem}>
              <Lock size={20} color={colors.textPrimary} />
              <Text style={styles.listItemText}>개인정보 및 보안</Text>
              <ChevronRight size={20} color={colors.textTertiary} />
            </Pressable>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>지원</Text>
          <View style={styles.card}>
            <Pressable
              style={styles.listItem}
              onPress={() => Linking.openURL('mailto:help@togethertherapy.kr?subject=도움말 문의')}
            >
              <LifeBuoy size={20} color={colors.textPrimary} />
              <Text style={styles.listItemText}>도움말 센터</Text>
              <ChevronRight size={20} color={colors.textTertiary} />
            </Pressable>
            <View style={styles.separator} />
            <Pressable
              style={styles.listItem}
              onPress={() => Linking.openURL('mailto:feedback@togethertherapy.kr?subject=앱 피드백')}
            >
              <MessageSquare size={20} color={colors.textPrimary} />
              <Text style={styles.listItemText}>피드백 보내기</Text>
              <ChevronRight size={20} color={colors.textTertiary} />
            </Pressable>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>정보</Text>
          <View style={styles.card}>
            <Pressable
              style={styles.listItem}
              onPress={() => router.push('/(auth)/terms' as any)}
            >
              <FileText size={20} color={colors.textPrimary} />
              <Text style={styles.listItemText}>서비스 이용약관</Text>
              <ChevronRight size={20} color={colors.textTertiary} />
            </Pressable>
            <View style={styles.separator} />
            <Pressable
              style={styles.listItem}
              onPress={() => router.push('/(auth)/privacy-policy' as any)}
            >
              <Shield size={20} color={colors.textPrimary} />
              <Text style={styles.listItemText}>개인정보 처리방침</Text>
              <ChevronRight size={20} color={colors.textTertiary} />
            </Pressable>
            <View style={styles.separator} />
            <View style={styles.listItem}>
              <Info size={20} color={colors.textPrimary} />
              <Text style={styles.listItemText}>버전 1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={actionLoading === 'logout'}
        >
          {actionLoading === 'logout' ? (
            <ActivityIndicator size="small" color="#E57373" />
          ) : (
            <View style={styles.logoutContent}>
              <LogOut size={20} color="#E57373" />
              <Text style={styles.logoutText}>로그아웃</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPage,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: headingFont,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  content: {
    gap: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8A8A8A',
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  logoutButton: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E57373',
  },
});
