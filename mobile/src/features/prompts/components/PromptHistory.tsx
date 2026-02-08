/**
 * Prompt History component - list of past exchanges
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { promptsApi } from '../services/promptsApi';
import type { DailyPromptAssignment } from '../types';

export function PromptHistory() {
  const [history, setHistory] = useState<DailyPromptAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await promptsApi.getPromptHistory();
      setHistory(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '히스토리를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: DailyPromptAssignment }) => {
    const [response1, response2] = item.responses;

    return (
      <View style={styles.item}>
        <Text style={styles.date}>
          {new Date(item.assigned_date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        <Text style={styles.prompt}>{item.prompt.text_ko}</Text>
        <View style={styles.responsesContainer}>
          <View style={styles.response}>
            <Text style={styles.responseUser}>
              {response1?.user_email?.split('@')[0]}
            </Text>
            <Text style={styles.responseText}>{response1?.response_text}</Text>
          </View>
          <View style={styles.response}>
            <Text style={styles.responseUser}>
              {response2?.user_email?.split('@')[0]}
            </Text>
            <Text style={styles.responseText}>{response2?.response_text}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6B7FD7" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>아직 대화 기록이 없습니다.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  list: {
    padding: 16,
  },
  item: {
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
  date: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  prompt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  responsesContainer: {
    gap: 8,
  },
  response: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  responseUser: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7FD7',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
