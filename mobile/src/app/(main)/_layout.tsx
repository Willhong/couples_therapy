import React from 'react';
import { Stack } from 'expo-router';

/**
 * Main app stack layout
 * Contains authenticated screens
 */
export default function MainLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="home" />
    </Stack>
  );
}
