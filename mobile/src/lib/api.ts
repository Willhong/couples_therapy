import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { TokenStorage } from './auth';

// API base URL from environment variable with fallback
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Subscribe to token refresh completion
 */
function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers that token has been refreshed
 */
function onTokenRefreshed(newToken: string): void {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

/**
 * Configured axios instance with authentication interceptors
 */
export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/auth/registration/',
  '/auth/token/',
  '/auth/token/refresh/',
];

/**
 * Check if the request URL is a public endpoint
 */
function isPublicEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

/**
 * Request interceptor - adds Authorization header with access token
 * Skips adding token for public endpoints (registration, login, token refresh)
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip adding token for public endpoints
    if (isPublicEndpoint(config.url)) {
      return config;
    }

    const token = await TokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handles 401 errors and token refresh
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If not a 401 error or already retried, reject immediately
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Check if we have a refresh token
    const refreshToken = await TokenStorage.getRefreshToken();
    if (!refreshToken) {
      // No refresh token, clear tokens and reject
      await TokenStorage.clearTokens();
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken: string) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          resolve(api(originalRequest));
        });
      });
    }

    // Start refresh process
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Call refresh endpoint (using axios directly to avoid interceptors)
      const response = await axios.post(`${API_URL}/api/v1/auth/token/refresh/`, {
        refresh: refreshToken,
      });

      const { access, refresh } = response.data;

      // Store new tokens
      await TokenStorage.setTokens(access, refresh || refreshToken);

      // Notify all queued requests
      onTokenRefreshed(access);

      // Update original request with new token and retry
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access}`;
      }

      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed, clear tokens
      await TokenStorage.clearTokens();
      refreshSubscribers = [];
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

/**
 * API response types
 */
export interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Helper to extract error message from API response
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    return data?.detail || data?.message || '알 수 없는 오류가 발생했습니다.';
  }
  return '네트워크 오류가 발생했습니다.';
}
