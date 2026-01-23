import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import { createInviteLink } from '@/utils/deepLink';

/**
 * Partner data
 */
export interface Partner {
  id: number;
  email: string;
}

/**
 * Couple connection data
 */
export interface Couple {
  id: number;
  status: 'pending' | 'active' | 'disconnected';
  connected_at: string | null;
  partner: Partner | null;
}

/**
 * Invite code response from API
 */
export interface InviteCode {
  code: string;
  expires_at: string;
  deep_link: string;
}

/**
 * Connection status type
 */
export type ConnectionStatus = 'none' | 'pending' | 'active' | 'disconnected';

/**
 * Partner context type
 */
interface PartnerContextType {
  couple: Couple | null;
  connectionStatus: ConnectionStatus;
  myInviteCode: InviteCode | null;
  loading: boolean;
  error: string | null;
  generateInviteCode: () => Promise<InviteCode>;
  enterCode: (code: string) => Promise<void>;
  getInviteLink: () => string | null;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Partner context with default values
 */
const PartnerContext = createContext<PartnerContextType | null>(null);

/**
 * Hook to access partner context
 */
export function usePartner(): PartnerContextType {
  const context = useContext(PartnerContext);
  if (!context) {
    throw new Error('usePartner must be used within a PartnerProvider');
  }
  return context;
}

interface PartnerProviderProps {
  children: ReactNode;
}

/**
 * Error code to Korean message mapping
 */
function getKoreanErrorMessage(error: unknown): string {
  const message = getApiErrorMessage(error);

  // Map common error messages to Korean
  const errorMappings: Record<string, string> = {
    'invalid_code': '유효하지 않은 코드입니다',
    'code_expired': '코드가 만료되었습니다',
    'code_already_used': '이미 사용된 코드입니다',
    'already_connected': '이미 파트너와 연결되어 있습니다',
    'own_code': '본인의 코드는 사용할 수 없습니다',
    'Invalid code': '유효하지 않은 코드입니다',
    'Code expired': '코드가 만료되었습니다',
    'Code already used': '이미 사용된 코드입니다',
    'Already connected': '이미 파트너와 연결되어 있습니다',
    'Cannot use own code': '본인의 코드는 사용할 수 없습니다',
  };

  // Check for specific error patterns
  for (const [key, koreanMessage] of Object.entries(errorMappings)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return koreanMessage;
    }
  }

  // Default error message
  return message || '연결에 실패했습니다. 다시 시도해주세요.';
}

/**
 * Partner provider component
 */
export function PartnerProvider({ children }: PartnerProviderProps): React.ReactElement {
  const [couple, setCouple] = useState<Couple | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('none');
  const [myInviteCode, setMyInviteCode] = useState<InviteCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh couple status from API
   */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ couple: Couple | null }>('/couples/');

      if (response.data.couple && response.data.couple.id) {
        setCouple(response.data.couple);
        setConnectionStatus(response.data.couple.status || 'active');
      } else {
        setCouple(null);
        setConnectionStatus('none');
      }
    } catch (err) {
      // 404 means no couple - this is normal
      setCouple(null);
      setConnectionStatus('none');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate a new invite code
   */
  const generateInviteCode = useCallback(async (): Promise<InviteCode> => {
    try {
      setError(null);

      const response = await api.post<{ code: string; expires_at: string }>('/couples/invite/generate/');

      const inviteCode: InviteCode = {
        code: response.data.code,
        expires_at: response.data.expires_at,
        deep_link: createInviteLink(response.data.code),
      };

      setMyInviteCode(inviteCode);
      return inviteCode;
    } catch (err) {
      const koreanError = getKoreanErrorMessage(err);
      setError(koreanError);
      throw new Error(koreanError);
    }
  }, []);

  /**
   * Enter partner's invite code to connect
   */
  const enterCode = useCallback(async (code: string): Promise<void> => {
    try {
      setError(null);

      const response = await api.post<{ message: string; couple: Couple }>('/couples/invite/redeem/', { code });

      setCouple(response.data.couple);
      setConnectionStatus('active');
    } catch (err) {
      const koreanError = getKoreanErrorMessage(err);
      setError(koreanError);
      throw new Error(koreanError);
    }
  }, []);

  /**
   * Get the invite deep link URL
   */
  const getInviteLink = useCallback((): string | null => {
    return myInviteCode?.deep_link || null;
  }, [myInviteCode]);

  /**
   * Disconnect from partner
   */
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      await api.post('/couples/disconnect/');

      setCouple(null);
      setConnectionStatus('disconnected');
      setMyInviteCode(null);
    } catch (err) {
      const koreanError = getKoreanErrorMessage(err);
      setError(koreanError);
      throw new Error(koreanError);
    }
  }, []);

  /**
   * Load partner status on mount
   */
  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: PartnerContextType = {
    couple,
    connectionStatus,
    myInviteCode,
    loading,
    error,
    generateInviteCode,
    enterCode,
    getInviteLink,
    disconnect,
    refresh,
    clearError,
  };

  return (
    <PartnerContext.Provider value={value}>
      {children}
    </PartnerContext.Provider>
  );
}
