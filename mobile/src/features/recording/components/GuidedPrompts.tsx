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
import { Hand } from 'lucide-react-native';
import { colors } from '@/theme';
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
  situation: colors.primaryBg,
  emotion: colors.errorBg,
  need: colors.successBg,
};

const CATEGORY_TEXT_COLORS: Record<GuidedPrompt['category'], string> = {
  situation: colors.infoText,
  emotion: colors.dangerText,
  need: colors.success,
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
      <View style={styles.labelRow}>
        <Text style={styles.label}>참고할 질문을 선택하세요</Text>
        <View style={styles.tapHint}>
          <Hand size={14} color={colors.textTertiary} />
          <Text style={styles.tapHintText}>탭하여 선택</Text>
        </View>
      </View>
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
                    : colors.bgPage,
                  borderColor: isSelected
                    ? CATEGORY_TEXT_COLORS[prompt.category]
                    : colors.border,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapHintText: {
    fontSize: 12,
    color: colors.textTertiary,
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
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipText: {
    fontSize: 14,
    color: colors.gray700,
  },
});
