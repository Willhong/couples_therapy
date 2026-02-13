import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api, getApiErrorMessage } from '@/lib/api';
import { colors } from '@/theme';

interface SharedReframing {
  id: string;
  message: {
    id: string;
    content: string;
    has_reframing: boolean;
    reframing_data?: {
      analysis?: unknown;
      suggestions?: string[];
    };
  };
  privacy_level: 'full' | 'summary' | 'none';
  shared_at: string;
  shared_by_email: string;
  partner_response?: string;
  is_read: boolean;
}

/**
 * Shared content screen - lists reframings shared by partner
 */
export default function SharedScreen(): React.ReactElement {
  const router = useRouter();
  const [sharedItems, setSharedItems] = useState<SharedReframing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSharedReframings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await api.get<SharedReframing[]>('/chat/shared/');
      setSharedItems(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSharedReframings();
  }, [loadSharedReframings]);

  const handleItemPress = useCallback(
    (item: SharedReframing) => {
      router.push({
        pathname: '/(main)/shared/[id]' as any,
        params: { id: item.id },
      });
    },
    [router]
  );

  const handleRetryPress = useCallback(() => {
    loadSharedReframings();
  }, [loadSharedReframings]);

  const handleRefresh = useCallback(() => {
    loadSharedReframings(true);
  }, [loadSharedReframings]);

  const keyExtractor = useCallback((item: SharedReframing) => item.id, []);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor={colors.primary}
      />
    ),
    [refreshing, handleRefresh]
  );

  const renderItem = useCallback(
    ({ item }: { item: SharedReframing }) => {
      const date = new Date(item.shared_at);
      const formattedDate = `${date.getMonth() + 1}월 ${date.getDate()}일`;

      return (
        <Pressable
          style={[styles.itemCard, !item.is_read && styles.unreadCard]}
          onPress={() => handleItemPress(item)}
        >
          {!item.is_read && <View style={styles.unreadIndicator} />}
          <View style={styles.itemHeader}>
            <Text style={styles.senderEmail}>{item.shared_by_email}</Text>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>
          <View style={styles.privacyBadge}>
            <Text style={styles.privacyText}>
              {item.privacy_level === 'full'
                ? '전체 공유'
                : item.privacy_level === 'summary'
                ? '요약만'
                : '알림만'}
            </Text>
          </View>
          {item.partner_response && (
            <Text style={styles.responseIndicator}>답변함</Text>
          )}
        </Pressable>
      );
    },
    [handleItemPress]
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>공유받은 내용</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>공유받은 내용</Text>
      </View>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={handleRetryPress}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : sharedItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>공유받은 내용이 없습니다</Text>
          <Text style={styles.emptySubtext}>
            파트너가 리프레이밍을 공유하면 여기에 표시됩니다
          </Text>
        </View>
      ) : (
        <FlatList
          data={sharedItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={refreshControl}
        />
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
    backgroundColor: colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  unreadCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  date: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  privacyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  responseIndicator: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.dangerText,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
