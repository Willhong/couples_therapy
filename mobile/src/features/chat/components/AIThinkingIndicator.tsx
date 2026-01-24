/**
 * AI Thinking Indicator component
 * Shows typing animation while AI is processing
 * Custom implementation without external dependencies
 */
import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const THINKING_MESSAGES = [
  '상대방 관점을 분석하고 있어요...',
  '양측의 감정을 이해하고 있어요...',
  '소통 패턴을 살펴보고 있어요...',
];

/**
 * Custom typing dots animation
 */
function TypingDots(): React.ReactElement {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnimation = (dotValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotValue, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dotValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      createDotAnimation(dot1, 0),
      createDotAnimation(dot2, 150),
      createDotAnimation(dot3, 300),
    ]);

    animation.start();

    return () => animation.stop();
  }, [dot1, dot2, dot3]);

  return (
    <View style={dotStyles.container}>
      <Animated.View style={[dotStyles.dot, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[dotStyles.dot, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[dotStyles.dot, { transform: [{ translateY: dot3 }] }]} />
    </View>
  );
}

const dotStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B7FD7',
  },
});

interface Props {
  statusMessage?: string;
}

export function AIThinkingIndicator({ statusMessage }: Props): React.ReactElement {
  const fallbackMessage = useMemo(
    () => THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)],
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <TypingDots />
      </View>
      <Text style={styles.statusText}>{statusMessage || fallbackMessage}</Text>
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
