/**
 * Prompt History route - displays history of daily prompts and responses
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors, headingFont } from '@/theme';

interface Response {
  username: string;
  text: string;
}

interface HistoryItem {
  id: string;
  date: string;
  prompt: string;
  responses: Response[];
}

const MOCK_HISTORY: HistoryItem[] = [
  {
    id: '1',
    date: '2025년 1월 14일',
    prompt: '오늘 파트너에게 가장 감사한 점은 무엇인가요?',
    responses: [
      {
        username: 'hong',
        text: '오늘 피곤한 나를 위해 저녁을 준비해줘서 감사해요.',
      },
      {
        username: 'partner',
        text: '항상 내 이야기를 끝까지 들어줘서 감사해요.',
      },
    ],
  },
  {
    id: '2',
    date: '2025년 1월 13일',
    prompt: '최근 파트너와의 대화에서 가장 기억에 남는 순간은?',
    responses: [
      {
        username: 'hong',
        text: '산책하면서 미래 계획에 대해 이야기한 것이 좋았어요.',
      },
      {
        username: 'partner',
        text: '같이 요리하면서 자연스럽게 대화한 시간이 좋았어요.',
      },
    ],
  },
];

export default function PromptHistoryRoute(): React.ReactElement {
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* History Items */}
          <View style={styles.historyList}>
            {MOCK_HISTORY.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <Text style={styles.date}>{item.date}</Text>
                <Text style={styles.prompt}>{item.prompt}</Text>
                <View style={styles.responsesContainer}>
                  {item.responses.map((response, index) => (
                    <View key={index} style={styles.responseCard}>
                      <Text style={styles.username}>{response.username}</Text>
                      <Text style={styles.responseText}>{response.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
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
});
