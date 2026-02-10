/**
 * Suggestion chips component
 * Displays tappable Korean suggestions for starting conversations
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors } from '@/theme';

const SUGGESTIONS = [
  '오늘 이런 일이 있었어요',
  '파트너가 이렇게 말했는데',
  '제가 이렇게 반응했어요',
  '속상한 감정이 들었어요',
  '어떻게 말해야 할지 모르겠어요',
];

interface Props {
  onSelect: (text: string) => void;
}

export function SuggestionChips({ onSelect }: Props): React.ReactElement {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SUGGESTIONS.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.chip}
            onPress={() => onSelect(suggestion + ' ')}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgPage,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
});
