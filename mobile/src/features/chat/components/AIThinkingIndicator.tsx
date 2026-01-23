/**
 * AI Thinking Indicator component
 * Shows typing animation while AI is processing
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TypingAnimation } from 'react-native-typing-animation';

const THINKING_MESSAGES = [
  '상대방 관점을 분석하고 있어요...',
  '양측의 감정을 이해하고 있어요...',
  '소통 패턴을 살펴보고 있어요...',
];

export function AIThinkingIndicator(): React.ReactElement {
  const randomMessage = useMemo(
    () => THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)],
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <TypingAnimation
          dotColor="#6B7FD7"
          dotMargin={8}
          dotAmplitude={3}
          dotSpeed={0.15}
          dotRadius={4}
        />
      </View>
      <Text style={styles.statusText}>{randomMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bubble: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
});
