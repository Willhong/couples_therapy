import React, { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/hooks/useAuth';
import { PartnerProvider } from '@/hooks/usePartner';
import { useInviteLink } from '@/utils/deepLink';
import { registerForPushNotifications, setupNotificationResponseHandler } from '@/services/notifications';
import { colors } from '@/theme';
import { useFonts, Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

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
export default function RootLayout(): React.ReactElement | null {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    registerForPushNotifications();
    setupNotificationResponseHandler();
  }, []);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PartnerProvider>
          <DeepLinkHandler>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.white },
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
    </SafeAreaProvider>
  );
}
