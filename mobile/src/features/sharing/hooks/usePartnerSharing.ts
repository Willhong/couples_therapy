/**
 * usePartnerSharing hook
 * WebSocket connection for real-time sharing notifications
 * Falls back to HTTP API when WebSocket is not available
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { TokenStorage } from '@/lib/auth';
import { api, WS_BASE_URL } from '@/lib/api';

interface SharedNotification {
  share_id: string;
  shared_by_email: string;
  privacy_level: string;
  preview: string;
}

interface UsePartnerSharingReturn {
  connected: boolean;
  sharing: boolean;
  pendingShares: SharedNotification[];
  shareReframing: (
    messageId: string,
    privacyLevel: 'full' | 'summary' | 'none'
  ) => Promise<void>;
  dismissShare: (shareId: string) => void;
}

export function usePartnerSharing(): UsePartnerSharingReturn {
  const [pendingShares, setPendingShares] = useState<SharedNotification[]>([]);
  const [connected, setConnected] = useState(false);
  const [sharing, setSharing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    async function connect() {
      try {
        const token = await TokenStorage.getAccessToken();
        if (!token || !mounted) return;

        // Don't attempt connection if WS_BASE_URL is not properly configured
        if (!WS_BASE_URL || WS_BASE_URL === 'ws://localhost:8000') {
          return;
        }

        const ws = new WebSocket(`${WS_BASE_URL}/ws/chat/?token=${token}`);

        ws.onopen = () => {
          if (mounted) setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'reframing_shared') {
              setPendingShares((prev) => [...prev, data]);
            } else if (data.type === 'share_confirmed') {
              setSharing(false);
            }
          } catch (e) {
            console.error('WebSocket message parse error:', e);
          }
        };

        ws.onclose = () => {
          if (mounted) {
            setConnected(false);
            wsRef.current = null;
          }
        };

        ws.onerror = (error) => {
          // Don't update state on error - onclose will handle it
        };

        wsRef.current = ws;
      } catch (error) {
        // Connection failed - will retry
      }
    }

    // Delay initial connection to avoid race conditions
    retryTimeout = setTimeout(connect, 1000);

    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      wsRef.current?.close();
    };
  }, []);

  const shareReframing = useCallback(
    async (
      messageId: string,
      privacyLevel: 'full' | 'summary' | 'none'
    ): Promise<void> => {
      setSharing(true);

      try {
        // Try WebSocket first if connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              action: 'share_reframing',
              message_id: messageId,
              privacy_level: privacyLevel,
            })
          );
        } else {
          // Fallback to HTTP API
          await api.post('/chat/share/', {
            message_id: messageId,
            privacy_level: privacyLevel,
          });
        }
      } catch (error) {
        // Extract error message from API response
        if (axios.isAxiosError(error) && error.response?.data?.detail) {
          throw new Error(error.response.data.detail);
        }
        throw error;
      } finally {
        setSharing(false);
      }
    },
    []
  );

  const dismissShare = useCallback((shareId: string) => {
    setPendingShares((prev) => prev.filter((s) => s.share_id !== shareId));
  }, []);

  return {
    connected,
    sharing,
    pendingShares,
    shareReframing,
    dismissShare,
  };
}
