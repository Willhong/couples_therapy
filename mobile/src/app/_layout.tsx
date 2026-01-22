import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/hooks/useAuth';
import { PartnerProvider } from '@/hooks/usePartner';
import { useInviteLink } from '@/utils/deepLink';

/**
 * Deep link handler component
 * Must be inside providers to access navigation
 */
function DeepLinkHandler({ children }: { children: React.ReactNode }): React.ReactElement {
  useInviteLink();
  return <>{children}</>;
}

/**
 * Root layout component
 * Wraps the entire app with AuthProvider, PartnerProvider, and configures navigation
 */
export default function RootLayout(): React.ReactElement {
  return (
    <AuthProvider>
      <PartnerProvider>
        <DeepLinkHandler>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#FFFFFF' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
            <Stack.Screen name="onboarding" />
          </Stack>
        </DeepLinkHandler>
      </PartnerProvider>
    </AuthProvider>
  );
}
