import React from 'react';
import { Stack } from 'expo-router';

/**
 * Main app layout (Phase 1: home only, no tabs)
 * Tabs will be added in later phases
 */
export default function MainLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="home" />
    </Stack>
  );
}
