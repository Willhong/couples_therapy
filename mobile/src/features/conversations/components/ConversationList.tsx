/**
 * ConversationList - full-screen FlatList of unified conversations.
 *
 * Supports pull-to-refresh, infinite scroll, and type-aware navigation.
 * - text  -> chat view
 * - narration (no post_action) -> post-recording-choice (deferred)
 * - narration (with post_action) -> transcript/[id]
 * - live -> transcript/[id]
 */
import React, { useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ConversationEntry } from '../types';
import { ConversationCard } from './ConversationCard';
import { useConversations } from '../hooks/useConversations';

export function ConversationList(): React.ReactElement {
  const router = useRouter();
  const {
    conversations,
    loading,
    refreshing,
    error,
    hasMore,
    refresh,
    loadMore,
  } = useConversations();

  const handlePress = useCallback(
    (item: ConversationEntry) => {
      if (item.type === 'text') {
        // Navigate to existing chat screen
        router.push('/(main)/chat');
        return;
      }

      // Audio types - navigate to transcript view
      if (item.recording_id) {
        router.push({
          pathname: '/(main)/transcript/[id]',
          params: { id: item.recording_id, from: 'home' },
        });
      }
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationEntry }) => (
      <ConversationCard item={item} onPress={handlePress} />
    ),
    [handlePress]
  );

  const keyExtractor = useCallback(
    (item: ConversationEntry) => item.id,
    []
  );

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#6B7FD7" />
      </View>
    );
  }, [hasMore]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6B7FD7" />
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={
        conversations.length === 0 ? styles.emptyContainer : styles.list
      }
      refreshing={refreshing}
      onRefresh={refresh}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{'(empty)'}</Text>
          <Text style={styles.emptyTitle}>아직 대화가 없어요</Text>
          <Text style={styles.emptySubtitle}>
            텍스트 대화를 시작하거나 녹음을 해보세요
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
