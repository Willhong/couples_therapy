/**
 * VoiceInputButton component
 * Quick action button for voice input (coming soon)
 */
import React from 'react';
import { Pressable, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function VoiceInputButton(): React.ReactElement {
  const handlePress = () => {
    Alert.alert('음성 입력', '음성 입력 기능은 준비 중입니다.');
  };

  return (
    <Pressable style={styles.button} onPress={handlePress}>
      <Ionicons name="mic-outline" size={14} color="#5A5A5A" />
      <Text style={styles.label}>음성</Text>
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
