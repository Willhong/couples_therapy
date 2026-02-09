/**
 * TopicRecommendButton component
 * Quick action button to navigate to topics screen
 */
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export function TopicRecommendButton(): React.ReactElement {
  const router = useRouter();

  const handlePress = () => {
    router.push('/(main)/topics' as any);
  };

  return (
    <Pressable style={styles.button} onPress={handlePress}>
      <Ionicons name="bulb-outline" size={14} color="#5A5A5A" />
      <Text style={styles.label}>주제 추천</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3EF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: '#5A5A5A',
  },
});
