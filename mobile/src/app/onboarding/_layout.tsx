import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/theme';

/**
 * Onboarding stack layout
 * Contains questionnaire, partner invitation and tutorial screens
 */
export default function OnboardingLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.white },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="questionnaire" />
      <Stack.Screen name="partner-link" />
      <Stack.Screen name="tutorial" />
    </Stack>
  );
}
