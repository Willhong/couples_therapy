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
import { colors, alpha } from '@/theme';

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
      {/* Outer circle */}
      <View style={styles.outerCircle} />

      {/* Middle circle */}
      <View style={styles.middleCircle} />

      {/* Inner animated circle with icon */}
      <Animated.View style={[styles.innerCircle, animatedStyle]}>
        <Text style={styles.leafIcon}>🍃</Text>
      </Animated.View>

      {/* Instruction text below */}
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
  outerCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: alpha(colors.primary, 0.25),
  },
  middleCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: alpha(colors.primary, 0.5),
  },
  innerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafIcon: {
    fontSize: 40,
    color: colors.white,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: -80,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 28,
    fontWeight: '500',
    fontFamily: 'Fraunces_500Medium',
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: alpha(colors.white, 0.5),
  },
});
