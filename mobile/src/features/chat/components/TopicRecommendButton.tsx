/**
 * TopicRecommendButton component
 * Quick action button to navigate to topics screen
 */
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';

export function TopicRecommendButton(): React.ReactElement {
  const router = useRouter();

  const handlePress = () => {
    router.push('/(main)/topics' as any);
  };

  return (
    <Pressable style={styles.button} onPress={handlePress}>
      <BookOpen size={14} color={colors.textSecondary} />
      <Text style={styles.label}>주제 추천</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.chipBg,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
