/**
 * Breathing guide component with 4-4-4 breathing pattern
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { useBreathingAnimation } from '../hooks/useBreathingAnimation';

export function BreathingGuide(): React.ReactElement {
  const { scale, instruction, phase } = useBreathingAnimation();

  const animatedStyle = useAnimatedStyle(() => {
    const scaleValue = interpolate(
      scale.value,
      [0.6, 1],
      phase === 'inhale' ? [0.6, 1] : phase === 'hold' ? [1, 1] : [1, 0.6]
    );

    return {
      transform: [{ scale: scaleValue }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.circle, animatedStyle]} />
      <View style={styles.instructionContainer}>
        <Text style={styles.instruction}>{instruction}</Text>
        <Text style={styles.subtitle}>4초</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(107, 127, 215, 0.2)',
    borderWidth: 3,
    borderColor: '#6B7FD7',
  },
  instructionContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  instruction: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
});
