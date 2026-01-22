import React from 'react';
import { Stack } from 'expo-router';

/**
 * Onboarding stack layout
 * Contains tutorial and partner invitation screens
 */
export default function OnboardingLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="tutorial" />
    </Stack>
  );
}
