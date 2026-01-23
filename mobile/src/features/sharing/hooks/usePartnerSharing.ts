/**
 * usePartnerSharing hook
 * WebSocket connection for real-time sharing notifications
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { TokenStorage } from '@/lib/auth';
import { WS_BASE_URL } from '@/lib/api';

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

    async function connect() {
      const token = await TokenStorage.getAccessToken();
      if (!token) return;

      const ws = new WebSocket(`${WS_BASE_URL}/ws/chat/?token=${token}`);

      ws.onopen = () => {
        if (mounted) setConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'reframing_shared') {
          setPendingShares((prev) => [...prev, data]);
        } else if (data.type === 'share_confirmed') {
          setSharing(false);
        }
      };

      ws.onclose = () => {
        if (mounted) setConnected(false);
      };

      ws.onerror = () => {
        if (mounted) setConnected(false);
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      mounted = false;
      wsRef.current?.close();
    };
  }, []);

  const shareReframing = useCallback(
    async (
      messageId: string,
      privacyLevel: 'full' | 'summary' | 'none'
    ): Promise<void> => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        throw new Error('연결되지 않았습니다');
      }

      setSharing(true);
      wsRef.current.send(
        JSON.stringify({
          action: 'share_reframing',
          message_id: messageId,
          privacy_level: privacyLevel,
        })
      );
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
