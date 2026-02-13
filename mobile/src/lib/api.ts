import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { TokenStorage } from './auth';

// API base URL from environment variable with fallback
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// WebSocket base URL (derived from API_URL)
export const WS_BASE_URL = API_URL.replace(/^http/, 'ws');

type RefreshSubscriber = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: RefreshSubscriber[] = [];

// Endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/auth/registration/',
  '/auth/token/',
  '/auth/token/refresh/',
];

const DEFAULT_API_ERROR_MESSAGE = '요청 처리 중 문제가 발생했습니다.';

const DEFAULT_API_ERROR_MAP_KEYS = [
  'detail',
  'message',
  'error',
  'non_field_errors',
  'non-field-errors',
  'code',
] as const;

/**
 * Subscribe to token refresh completion
 */
function subscribeTokenRefresh(
  onSuccess: (token: string) => void,
  onFailure: (error: unknown) => void
): void {
  refreshSubscribers.push({ resolve: onSuccess, reject: onFailure });
}

/**
 * Notify all subscribers that token has been refreshed
 */
function onTokenRefreshed(newToken: string): void {
  const subscribers = [...refreshSubscribers];
  refreshSubscribers = [];
  subscribers.forEach((subscriber) => subscriber.resolve(newToken));
}

/**
 * Reject all subscribers when refresh fails
 */
function onTokenRefreshFailed(error: unknown): void {
  const subscribers = [...refreshSubscribers];
  refreshSubscribers = [];
  subscribers.forEach((subscriber) => subscriber.reject(error));
}

function isPublicEndpoint(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

export interface ApiError {
  detail?: unknown;
  message?: unknown;
  [key: string]: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function extractMessage(value: unknown, visited = new Set<unknown>()): string | undefined {
  if (!value || visited.has(value)) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    visited.add(value);
    for (const item of value) {
      const nested = extractMessage(item, visited);
      if (nested) {
        return nested;
      }
    }
    return undefined;
  }

  if (isObject(value)) {
    visited.add(value);

    for (const key of DEFAULT_API_ERROR_MAP_KEYS) {
      if (key in value) {
        const nested = extractMessage(value[key], visited);
        if (nested) {
          return nested;
        }
      }
    }

    for (const candidate of Object.values(value)) {
      const nested = extractMessage(candidate, visited);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

function parseAxiosErrorMessage(error: AxiosError<ApiError>): string {
  const data = error.response?.data;
  if (!data) {
    return error.message || DEFAULT_API_ERROR_MESSAGE;
  }
  return extractMessage(data) || error.message || DEFAULT_API_ERROR_MESSAGE;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return parseAxiosErrorMessage(error);
  }
  if (error && typeof error === 'object' && 'response' in error) {
    const typedError = error as { response?: AxiosError<ApiError>['response']; message?: string };
    if (typedError.response?.data) {
      return extractMessage(typedError.response.data as unknown) || typedError.message || DEFAULT_API_ERROR_MESSAGE;
    }
  }
  if (error instanceof Error) {
    return error.message || DEFAULT_API_ERROR_MESSAGE;
  }
  return DEFAULT_API_ERROR_MESSAGE;
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

/**
 * Request interceptor - adds Authorization header with access token
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isPublicEndpoint(config.url)) {
      return config;
    }

    const token = await TokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor - handles 401 errors and token refresh
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean } | undefined;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = await TokenStorage.getRefreshToken();
    if (!refreshToken) {
      await TokenStorage.clearTokens();
      onTokenRefreshFailed(error);
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(
          (newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(api(originalRequest));
          },
          (refreshError) => reject(refreshError)
        );
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await axios.post(`${API_URL}/api/v1/auth/token/refresh/`, {
        refresh: refreshToken,
      });

      const { access, refresh } = response.data as {
        access?: string;
        refresh?: string;
      };

      if (!access) {
        throw new Error('토큰 재발급에 필요한 응답이 없습니다.');
      }

      await TokenStorage.setTokens(access, refresh || refreshToken);
      onTokenRefreshed(access);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access}`;
      }

      return api(originalRequest);
    } catch (refreshError) {
      await TokenStorage.clearTokens();
      onTokenRefreshFailed(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
