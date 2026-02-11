/**
 * Journal route - diary/journal entries for reflection
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Lightbulb } from 'lucide-react-native';
import { colors, headingFont } from '@/theme';

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  tag: string;
  tagColor: 'sage' | 'warm';
}

const MOCK_ENTRIES: JournalEntry[] = [
  {
    id: '1',
    date: '2월 5일 월요일',
    title: '주말 여행',
    content: '드디어 계획했던 여행을 다녀왔어요! 숲 속 오두막이 너무 평화로웠고 함께 일상에서 벗어나 시간이 점 말 좋았어요...',
    tag: '연결감 느낌',
    tagColor: 'sage',
  },
  {
    id: '2',
    date: '2월 3일 토요일',
    title: '감사 체크인',
    content: '오늘 내가 일 때문에 스트레스받을 때 마이클이 얼마나 잘 들어주는지 깨달았어요. 치를 끓여주고...',
    tag: '감사한 마음',
    tagColor: 'warm',
  },
];

export default function JournalRoute(): React.ReactElement {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>우리의 일기</Text>
        <View style={styles.headerButtons}>
          <Pressable style={styles.iconButton}>
            <Search size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.addButton}>
            <Plus size={20} color={colors.white} />
          </Pressable>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily Prompt Card */}
        <View style={styles.promptCard}>
          <Lightbulb size={20} color={colors.primary} />
          <View style={styles.promptContent}>
            <Text style={styles.promptLabel}>오늘의 주제</Text>
            <Text style={styles.promptText}>이번 주 함께 웃었던 순간은?</Text>
          </View>
        </View>

        {/* Journal Entries Section */}
        <View style={styles.entriesSection}>
          <Text style={styles.sectionLabel}>이번 주</Text>

          {MOCK_ENTRIES.map((entry) => (
            <Pressable key={entry.id} style={styles.entryCard}>
              <Text style={styles.entryDate}>{entry.date}</Text>
              <Text style={styles.entryTitle}>{entry.title}</Text>
              <Text style={styles.entryContent} numberOfLines={3}>
                {entry.content}
              </Text>
              <View style={[
                styles.entryTag,
                entry.tagColor === 'sage' ? styles.entryTagSage : styles.entryTagWarm
              ]}>
                <Text style={[
                  styles.entryTagText,
                  entry.tagColor === 'sage' ? styles.entryTagTextSage : styles.entryTagTextWarm
                ]}>
                  {entry.tag}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
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
});
