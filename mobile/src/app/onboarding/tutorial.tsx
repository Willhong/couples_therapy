import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Tutorial screen placeholder
 * Will be implemented with react-native-copilot in Plan 01-04
 */
export default function Tutorial(): React.ReactElement {
  const router = useRouter();

  const handleComplete = () => {
    // TODO: Mark tutorial as completed via API
    // For now, just navigate to main app
    router.replace('/(main)/home');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>튜토리얼</Text>
      <Text style={styles.description}>
        튜토리얼은 다음 플랜(01-04)에서 구현됩니다.
      </Text>
      <Pressable style={styles.button} onPress={handleComplete}>
        <Text style={styles.buttonText}>계속하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#4B5563',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
