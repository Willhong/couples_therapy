/**
 * Push notification service for Expo
 * Handles registration, token management, and deep linking
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and send token to backend
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.error('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      // EAS not configured yet - silently skip push registration
      return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    // Register with backend
    await api.post('/users/push-token/', { push_token: token });

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'CouplesAI',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return token;
  } catch (error) {
    console.error('Failed to register push notifications:', error);
    return null;
  }
}

/**
 * Unregister push token from backend
 */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    await api.post('/users/push-token/unregister/');
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}

/**
 * Handle notification tap - navigate to appropriate screen
 */
export function setupNotificationResponseHandler(): void {
  Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    switch (data?.type) {
      case 'consent_request':
        router.push('/(main)/record');
        break;
      case 'daily_prompt':
        router.push('/(main)/chat');
        break;
      case 'cooldown_complete':
        router.push('/(main)/cooldown');
        break;
      case 'shared_reframing':
        router.push('/(main)/chat');
        break;
      case 'weekly_insight':
        router.push('/(main)/insights');
        break;
      default:
        router.push('/(main)/chat');
    }
  });
}
