/**
 * Topic Library component for browsing conversation topics by category
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { promptsApi } from '../services/promptsApi';
import { DailyPrompt, TopicLibraryResponse } from '../types';
import { getApiErrorMessage } from '@/lib/api';

const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'daily', label: '일상' },
  { key: 'dreams', label: '꿈/목표' },
  { key: 'memories', label: '추억' },
  { key: 'gratitude', label: '감사' },
  { key: 'future', label: '미래' },
  { key: 'deep', label: '깊은 대화' },
];

export function TopicLibrary() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [topics, setTopics] = useState<TopicLibraryResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<DailyPrompt | null>(null);

  useEffect(() => {
    loadTopics();
  }, [selectedCategory]);

  const loadTopics = async () => {
    try {
      setLoading(true);
      setError(null);
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const data = await promptsApi.getTopicLibrary(category);
      setTopics(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleTopicPress = (topic: DailyPrompt) => {
    setSelectedTopic(topic);
  };

  const handleStartConversation = () => {
    if (selectedTopic) {
      // Navigate to chat with the prompt pre-filled
      router.push({
        pathname: '/chat',
        params: { prompt: selectedTopic.text_ko },
      });
      setSelectedTopic(null);
    }
  };

  const renderTopicCard = (topic: DailyPrompt) => (
    <Pressable
      key={topic.id}
      style={styles.topicCard}
      onPress={() => handleTopicPress(topic)}
    >
      <View style={styles.topicHeader}>
        <Text style={styles.categoryBadge}>{topic.category_display}</Text>
        <Text style={styles.difficultyBadge}>
          {'★'.repeat(topic.difficulty_level)}
        </Text>
      </View>
      <Text style={styles.topicText}>{topic.text_ko}</Text>
    </Pressable>
  );

  const renderTopicsByCategory = () => {
    const categories = Object.keys(topics).sort();

    if (categories.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>주제가 없습니다.</Text>
        </View>
      );
    }

    return categories.map((category) => (
      <View key={category} style={styles.categorySection}>
        <Text style={styles.categorySectionTitle}>
          {CATEGORIES.find((c) => c.key === category)?.label || category}
        </Text>
        {topics[category].map(renderTopicCard)}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabs}
        contentContainerStyle={styles.categoryTabsContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryTab,
              selectedCategory === cat.key && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === cat.key && styles.categoryTabTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Topics list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B7FD7" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTopics}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.topicsScroll}
          contentContainerStyle={styles.topicsContent}
          showsVerticalScrollIndicator={false}
        >
          {renderTopicsByCategory()}
        </ScrollView>
      )}

      {/* Topic detail modal */}
      {selectedTopic && (
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSelectedTopic(null)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalCategory}>
                {selectedTopic.category_display}
              </Text>
              <TouchableOpacity onPress={() => setSelectedTopic(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalTopicText}>{selectedTopic.text_ko}</Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartConversation}
            >
              <Text style={styles.startButtonText}>이 주제로 대화하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  categoryTabs: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  categoryTabActive: {
    backgroundColor: '#6B7FD7',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6B7FD7',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  topicsScroll: {
    flex: 1,
  },
  topicsContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  categorySection: {
    marginBottom: 24,
  },
  categorySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  topicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7FD7',
    backgroundColor: 'rgba(107, 127, 215, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyBadge: {
    fontSize: 12,
    color: '#F59E0B',
  },
  topicText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 22,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7FD7',
  },
  modalClose: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  modalTopicText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#6B7FD7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
