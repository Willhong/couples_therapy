/**
 * VoiceInputButton component
 * Quick action button for voice input (coming soon)
 */
import React from 'react';
import { Pressable, Text, StyleSheet, Alert } from 'react-native';
import { Mic } from 'lucide-react-native';
import { colors } from '@/theme';

export function VoiceInputButton(): React.ReactElement {
  const handlePress = () => {
    Alert.alert('음성 입력', '음성 입력 기능은 준비 중입니다.');
  };

  return (
    <Pressable style={styles.button} onPress={handlePress}>
      <Mic size={14} color={colors.textSecondary} />
      <Text style={styles.label}>음성</Text>
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
