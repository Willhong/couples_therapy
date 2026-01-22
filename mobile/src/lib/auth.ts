import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Secure token storage using device keychain/keystore
 * - iOS: Keychain Services
 * - Android: Android Keystore
 */
export const TokenStorage = {
  /**
   * Get the stored access token
   * @returns Access token or null if not stored
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  },

  /**
   * Get the stored refresh token
   * @returns Refresh token or null if not stored
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  },

  /**
   * Store both access and refresh tokens securely
   * @param access - The access token
   * @param refresh - The refresh token
   */
  async setTokens(access: string, refresh: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw error;
    }
  },

  /**
   * Clear all stored tokens (logout)
   */
  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      throw error;
    }
  },

  /**
   * Check if tokens exist (for initial auth check)
   * @returns true if access token exists
   */
  async hasTokens(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  },
};
