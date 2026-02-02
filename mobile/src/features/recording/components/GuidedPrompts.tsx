/**
 * GuidedPrompts component
 * Scrollable Korean prompts for self-narration guidance
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { GuidedPrompt } from '../types';

const GUIDED_PROMPTS: GuidedPrompt[] = [
  // Situation prompts
  {
    id: 'sit-1',
    text: '오늘 있었던 일을 설명해주세요',
    category: 'situation',
  },
  {
    id: 'sit-2',
    text: '어떤 상황에서 갈등이 시작되었나요?',
    category: 'situation',
  },
  // Emotion prompts
  {
    id: 'emo-1',
    text: '지금 어떤 감정을 느끼고 있나요?',
    category: 'emotion',
  },
  {
    id: 'emo-2',
    text: '가장 힘들었던 순간은 언제였나요?',
    category: 'emotion',
  },
  // Need prompts
  {
    id: 'need-1',
    text: '상대방에게 어떤 말을 듣고 싶으세요?',
    category: 'need',
  },
  {
    id: 'need-2',
    text: '이 상황에서 무엇이 필요한가요?',
    category: 'need',
  },
];

const CATEGORY_LABELS: Record<GuidedPrompt['category'], string> = {
  situation: '상황',
  emotion: '감정',
  need: '필요',
};

const CATEGORY_COLORS: Record<GuidedPrompt['category'], string> = {
  situation: '#DBEAFE',
  emotion: '#FEE2E2',
  need: '#D1FAE5',
};

const CATEGORY_TEXT_COLORS: Record<GuidedPrompt['category'], string> = {
  situation: '#1E40AF',
  emotion: '#991B1B',
  need: '#065F46',
};

interface Props {
  visible: boolean;
  onPromptSelect: (prompt: GuidedPrompt) => void;
  selectedId?: string | null;
}

export function GuidedPrompts({
  visible,
  onPromptSelect,
  selectedId,
}: Props): React.ReactElement | null {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>참고할 질문을 선택하세요</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {GUIDED_PROMPTS.map((prompt) => {
          const isSelected = selectedId === prompt.id;
          return (
            <TouchableOpacity
              key={prompt.id}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? CATEGORY_COLORS[prompt.category]
                    : '#F9FAFB',
                  borderColor: isSelected
                    ? CATEGORY_TEXT_COLORS[prompt.category]
                    : '#E5E7EB',
                },
              ]}
              onPress={() => onPromptSelect(prompt)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryBadge,
                  { color: CATEGORY_TEXT_COLORS[prompt.category] },
                ]}
              >
                {CATEGORY_LABELS[prompt.category]}
              </Text>
              <Text
                style={[
                  styles.chipText,
                  isSelected && {
                    color: CATEGORY_TEXT_COLORS[prompt.category],
                  },
                ]}
              >
                {prompt.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
  },
});
