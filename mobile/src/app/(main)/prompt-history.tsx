/**
 * Prompt History route - displays history of daily prompts and responses
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors, headingFont } from '@/theme';
import { usePromptHistory } from '@/features/prompts/hooks/usePromptHistory';

export default function PromptHistoryRoute(): React.ReactElement {
  const { history, loading, error, refetch } = usePromptHistory();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <>
      <Stack.Screen
        options={{
          title: '대화 기록',
          headerShown: true,
          headerTitleStyle: {
            fontFamily: headingFont,
            fontSize: 22,
            fontWeight: '500',
          },
          headerStyle: {
            backgroundColor: colors.bgPage,
          },
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        {loading && !history.length ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error && !history.length ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>아직 교환된 대화가 없어요</Text>
            <Text style={styles.emptyDescription}>
              매일 새로운 질문에 파트너와 함께 답해보세요
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <View style={styles.historyList}>
              {history.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <Text style={styles.date}>{item.assigned_date}</Text>
                  <Text style={styles.prompt}>{item.prompt.text_ko}</Text>
                  <View style={styles.responsesContainer}>
                    {item.responses.map((response, index) => (
                      <View key={index} style={styles.responseCard}>
                        <Text style={styles.username}>
                          {response.user_email.split('@')[0]}
                        </Text>
                        <Text style={styles.responseText}>{response.response_text}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  date: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  prompt: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  responsesContainer: {
    gap: 8,
  },
  responseCard: {
    backgroundColor: '#F5F5F0',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  username: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  responseText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
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
  },
});
