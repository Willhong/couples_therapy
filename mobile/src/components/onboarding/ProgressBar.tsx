import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Progress bar component for onboarding flow
 * Shows visual progress through step segments
 */
export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            index < currentStep && styles.segmentFilled,
            index < totalSteps - 1 && styles.segmentWithMargin,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 4,
  },
  segment: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  segmentFilled: {
    backgroundColor: colors.gray600,
  },
  segmentWithMargin: {
    marginRight: 8,
  },
});
