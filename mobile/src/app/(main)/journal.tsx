/**
 * Journal route - diary/journal entries from daily check-ins
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, Plus, Lightbulb, X } from 'lucide-react-native';
import { colors, headingFont } from '@/theme';
import { api } from '@/lib/api';
import { useJournalEntries, type JournalEntry } from '@/features/checkin/hooks/useJournalEntries';

function getMoodTag(mood: number): { tag: string; tagColor: 'sage' | 'warm' } {
  if (mood >= 4) return { tag: '좋은 하루', tagColor: 'sage' };
  if (mood === 3) return { tag: '보통 하루', tagColor: 'sage' };
  return { tag: '힘든 하루', tagColor: 'warm' };
}

export default function JournalRoute(): React.ReactElement {
  const router = useRouter();
  const { entries, loading, error, refetch } = useJournalEntries();
  const [refreshing, setRefreshing] = useState(false);
  const [dailyPrompt, setDailyPrompt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Fetch daily prompt
  useEffect(() => {
    (async () => {
      try {
        const response = await api.get<{ text_ko: string }>('/prompts/today/');
        setDailyPrompt(response.data.text_ko);
      } catch {
        setDailyPrompt(null);
      }
    })();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Filter entries by search
  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          e.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.mood_display?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>우리의 일기</Text>
        <View style={styles.headerButtons}>
          <Pressable
            style={styles.iconButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            {showSearch ? (
              <X size={20} color={colors.textPrimary} />
            ) : (
              <Search size={20} color={colors.textPrimary} />
            )}
          </Pressable>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/(main)/checkin-flow')}
          >
            <Plus size={20} color={colors.white} />
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="기록 검색..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      )}

      {/* Loading State */}
      {loading && !entries.length ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && !entries.length ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
          <Text style={styles.emptyDescription}>
            오늘의 체크인을 시작해보세요
          </Text>
          <Pressable
            style={styles.ctaButton}
            onPress={() => router.push('/(main)/checkin-flow')}
          >
            <Text style={styles.ctaButtonText}>체크인 시작하기</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Daily Prompt Card */}
          <View style={styles.promptCard}>
            <Lightbulb size={20} color={colors.primary} />
            <View style={styles.promptContent}>
              <Text style={styles.promptLabel}>오늘의 주제</Text>
              <Text style={styles.promptText}>
                {dailyPrompt || '오늘의 질문을 불러오는 중...'}
              </Text>
            </View>
          </View>

          {/* Journal Entries Section */}
          <View style={styles.entriesSection}>
            <Text style={styles.sectionLabel}>기록</Text>

            {filteredEntries.map((entry) => {
              const { tag, tagColor } = getMoodTag(entry.mood);
              return (
                <Pressable
                  key={entry.id}
                  style={styles.entryCard}
                  onPress={() => {
                    // Navigate to checkin-flow for viewing (future: detail screen)
                    router.push('/(main)/checkin-flow');
                  }}
                >
                  <Text style={styles.entryDate}>{entry.date}</Text>
                  <Text style={styles.entryTitle}>{entry.mood_display}</Text>
                  {entry.note ? (
                    <Text style={styles.entryContent} numberOfLines={3}>
                      {entry.note}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.entryTag,
                      tagColor === 'sage'
                        ? styles.entryTagSage
                        : styles.entryTagWarm,
                    ]}
                  >
                    <Text
                      style={[
                        styles.entryTagText,
                        tagColor === 'sage'
                          ? styles.entryTagTextSage
                          : styles.entryTagTextWarm,
                      ]}
                    >
                      {tag}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontFamily: headingFont,
    fontSize: 28,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 100,
    gap: 20,
  },
  promptCard: {
    width: '100%',
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  promptContent: {
    flex: 1,
    gap: 4,
  },
  promptLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary,
  },
  promptText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  entriesSection: {
    gap: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: -4,
  },
  entryCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  entryTitle: {
    fontFamily: headingFont,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  entryContent: {
    fontSize: 14,
    color: '#5A5A5A',
    lineHeight: 20,
  },
  entryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  entryTagSage: {
    backgroundColor: colors.primaryLight,
  },
  entryTagWarm: {
    backgroundColor: '#F5EDE8',
  },
  entryTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  entryTagTextSage: {
    color: colors.primary,
  },
  entryTagTextWarm: {
    color: colors.accentWarm,
  },
  errorText: {
    fontSize: 16,
    color: colors.error || '#E57373',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  ctaButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
