import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { useRecordingConsent, ConsentStatus } from '@/hooks/useRecordingConsent';
import { useAuth } from '@/hooks/useAuth';
import { colors, alpha } from '@/theme';

interface DualConsentPromptProps {
  visible: boolean;
  onConsent: () => void;
  onDecline: () => void;
  onClose: () => void;
}

/**
 * Status circle component
 */
function StatusCircle({
  label,
  consented,
  waiting,
}: {
  label: string;
  consented: boolean;
  waiting: boolean;
}): React.ReactElement {
  return (
    <View style={styles.statusCircleContainer}>
      <View
        style={[
          styles.statusCircle,
          consented ? styles.consentedCircle : styles.waitingCircle,
        ]}
      >
        {consented ? (
          <Text style={styles.checkmark}>✓</Text>
        ) : (
          <Text style={styles.waitingDot}>•</Text>
        )}
      </View>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusText}>
        {consented ? '동의함' : waiting ? '대기 중' : '-'}
      </Text>
    </View>
  );
}

/**
 * Dual consent prompt modal
 * Shows consent status for both partners with real-time sync
 */
export default function DualConsentPrompt({
  visible,
  onConsent,
  onDecline,
  onClose,
}: DualConsentPromptProps): React.ReactElement {
  const { user } = useAuth();
  const {
    consentRequest,
    myConsent,
    partnerConsent,
    partnerOnline,
    status,
    error,
    isConnected,
    connect,
    disconnect,
    initiateConsent,
    giveConsent,
    denyConsent,
    withdrawConsent,
    reset,
  } = useRecordingConsent();

  // Connect WebSocket when modal opens
  useEffect(() => {
    if (visible) {
      connect();
    } else {
      // Don't disconnect immediately to allow state updates
    }
  }, [visible, connect]);

  // Handle status changes
  useEffect(() => {
    if (status === 'approved') {
      // Brief delay to show success state
      const timer = setTimeout(() => {
        onConsent();
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'declined' || status === 'withdrawn' || status === 'expired') {
      // Brief delay to show status
      const timer = setTimeout(() => {
        onDecline();
        reset();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, onConsent, onDecline, reset]);

  // Check if I am the requester
  const isRequester = consentRequest?.requester_id === user?.id;
  // Check if this is a new request (I haven't taken action yet)
  const isNewRequest = !!consentRequest && !isRequester && !myConsent && status === 'pending';

  // Start consent request when modal opens (if I'm initiating)
  const handleStartRequest = () => {
    if (!isConnected) {
      // Wait for connection
      return;
    }
    initiateConsent();
  };

  // Handle close button
  const handleClose = () => {
    if (status === 'pending' && consentRequest) {
      if (isRequester) {
        withdrawConsent();
      } else {
        denyConsent();
      }
    }
    reset();
    onClose();
  };

  // Get status message
  const getStatusMessage = (): string => {
    if (!isConnected) {
      return '연결 중...';
    }
    if (!partnerOnline && status !== 'approved') {
      return '파트너가 오프라인입니다';
    }
    if (error) {
      return error;
    }
    if (status === 'approved') {
      return '양측 동의 완료!';
    }
    if (status === 'declined') {
      return isRequester ? '파트너가 녹음을 거절했습니다' : '녹음을 거절했습니다';
    }
    if (status === 'withdrawn') {
      return '요청이 취소되었습니다';
    }
    if (status === 'expired') {
      return '요청이 만료되었습니다';
    }
    if (isNewRequest) {
      return '파트너가 녹음을 요청했습니다';
    }
    if (isRequester && myConsent && !partnerConsent) {
      return '파트너의 동의를 기다리는 중...';
    }
    if (!consentRequest) {
      return '녹음을 시작하려면 동의를 요청하세요';
    }
    return '';
  };

  // Render action buttons based on state
  const renderActions = () => {
    if (status === 'approved' || status === 'declined' || status === 'withdrawn') {
      return null; // No actions needed, will auto-close
    }

    if (!consentRequest) {
      // No request yet - show initiate button
      return (
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.primaryButton, !partnerOnline && styles.disabledButton]}
            onPress={handleStartRequest}
            disabled={!partnerOnline || !isConnected}
          >
            <Text style={styles.primaryButtonText}>
              {!isConnected ? '연결 중...' : '동의 요청하기'}
            </Text>
          </Pressable>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleClose}>
            <Text style={styles.secondaryButtonText}>취소</Text>
          </Pressable>
        </View>
      );
    }

    if (isNewRequest) {
      // Partner requested, waiting for my response
      return (
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={giveConsent}
          >
            <Text style={styles.primaryButtonText}>동의하기</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.dangerButton]}
            onPress={denyConsent}
          >
            <Text style={styles.dangerButtonText}>거절</Text>
          </Pressable>
        </View>
      );
    }

    if (isRequester && status === 'pending') {
      // I requested, waiting for partner
      return (
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={withdrawConsent}
          >
            <Text style={styles.secondaryButtonText}>취소하기</Text>
          </Pressable>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>녹음 동의</Text>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          {/* Description */}
          <View style={styles.description}>
            <Text style={styles.descriptionText}>
              녹음을 시작하려면 두 분 모두의 동의가 필요합니다.
            </Text>
            <Text style={styles.subText}>
              녹음된 대화는 분석을 위해서만 사용됩니다.
            </Text>
          </View>

          {/* Consent status circles */}
          <View style={styles.statusContainer}>
            <StatusCircle
              label="나"
              consented={myConsent}
              waiting={status === 'pending'}
            />
            <View style={styles.statusDivider} />
            <StatusCircle
              label="파트너"
              consented={partnerConsent === true}
              waiting={status === 'pending' && partnerConsent === null}
            />
          </View>

          {/* Status message */}
          <View style={styles.messageContainer}>
            <Text
              style={[
                styles.statusMessage,
                status === 'approved' && styles.successMessage,
                status === 'declined' && styles.errorMessage,
                !partnerOnline && styles.warningMessage,
              ]}
            >
              {getStatusMessage()}
            </Text>
          </View>

          {/* Action buttons */}
          {renderActions()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: alpha(colors.black, 0.5),
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.bgAiMessage,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
    lineHeight: 28,
  },
  description: {
    padding: 16,
    alignItems: 'center',
  },
  descriptionText: {
    fontSize: 14,
    color: colors.gray700,
    textAlign: 'center',
    marginBottom: 4,
  },
  subText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  statusCircleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  statusCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  waitingCircle: {
    backgroundColor: colors.bgAiMessage,
    borderWidth: 2,
    borderColor: colors.gray300,
  },
  consentedCircle: {
    backgroundColor: colors.success,
    borderWidth: 0,
  },
  checkmark: {
    fontSize: 28,
    color: colors.white,
    fontWeight: 'bold',
  },
  waitingDot: {
    fontSize: 32,
    color: colors.textTertiary,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusDivider: {
    width: 48,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  messageContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  statusMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  successMessage: {
    color: colors.success,
    fontWeight: '600',
  },
  errorMessage: {
    color: colors.error,
  },
  warningMessage: {
    color: colors.warningAmber,
  },
  actions: {
    padding: 16,
    paddingTop: 8,
    gap: 8,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.gray600,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.bgAiMessage,
  },
  secondaryButtonText: {
    color: colors.gray700,
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: colors.errorBg,
  },
  dangerButtonText: {
    color: colors.dangerText,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
