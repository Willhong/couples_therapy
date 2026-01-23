import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePartner } from '@/hooks/usePartner';
import { useAuth } from '@/hooks/useAuth';
import { ProgressBar } from '@/components/onboarding/ProgressBar';

/**
 * Partner Link screen for onboarding
 * Allows users to generate invite codes, share them, and enter partner codes
 */
export default function PartnerLinkScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { user } = useAuth();
  const {
    connectionStatus,
    myInviteCode,
    couple,
    loading: partnerLoading,
    error,
    generateInviteCode,
    enterCode,
    getInviteLink,
    clearError,
    refresh,
  } = usePartner();

  // Determine next screen based on tutorial completion
  const getNextScreen = () => {
    return user?.tutorial_completed ? '/(main)/home' : '/onboarding/tutorial';
  };

  const [inputCode, setInputCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [deepLinkModalVisible, setDeepLinkModalVisible] = useState(false);

  // Handle deep link code from params
  useEffect(() => {
    if (params.code && params.code.length === 6) {
      setInputCode(params.code.toUpperCase());
      setDeepLinkModalVisible(true);
    }
  }, [params.code]);

  // Auto-navigate after successful connection
  useEffect(() => {
    if (connectionStatus === 'active' && couple?.partner) {
      // Small delay to show success state briefly
      const timer = setTimeout(() => {
        router.replace(getNextScreen() as any);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, couple?.partner, router, user?.tutorial_completed]);

  // Poll for connection status when invite code is generated (for the code generator side)
  useEffect(() => {
    if (!myInviteCode || connectionStatus === 'active') {
      return;
    }

    // Poll every 3 seconds to check if partner connected
    const pollInterval = setInterval(async () => {
      try {
        await refresh();
      } catch {
        // Ignore errors during polling
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [myInviteCode, connectionStatus, refresh]);

  // Handle code generation
  const handleGenerateCode = async () => {
    try {
      setIsGenerating(true);
      clearError();
      await generateInviteCode();
    } catch {
      // Error is handled in usePartner
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle code copy to clipboard
  const handleCopyCode = async () => {
    if (myInviteCode?.code) {
      await Clipboard.setStringAsync(myInviteCode.code);
      setCopyToastVisible(true);
      setTimeout(() => setCopyToastVisible(false), 2000);
    }
  };

  // Handle share via system share sheet
  const handleShare = async () => {
    const link = getInviteLink();
    if (link) {
      try {
        await Share.share({
          message: `커플스 AI에서 함께 사용해요! 초대 코드: ${myInviteCode?.code}\n\n링크로 바로 연결하기: ${link}`,
        });
      } catch {
        // User cancelled or share failed
      }
    }
  };

  // Handle code input
  const handleCodeChange = (text: string) => {
    // Only allow alphanumeric, uppercase, max 6 chars
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setInputCode(cleaned);
    clearError();
  };

  // Handle partner connection
  const handleConnect = async () => {
    if (inputCode.length !== 6) return;

    try {
      setIsConnecting(true);
      clearError();
      await enterCode(inputCode);
      // Success - connectionStatus will update to 'active'
    } catch {
      // Error is handled in usePartner
    } finally {
      setIsConnecting(false);
      setDeepLinkModalVisible(false);
    }
  };

  // Handle deep link connection confirmation
  const handleDeepLinkConnect = async () => {
    await handleConnect();
  };

  // Handle skip partner connection
  const handleSkip = () => {
    setSkipModalVisible(true);
  };

  // Confirm skip and continue
  const handleConfirmSkip = () => {
    setSkipModalVisible(false);
    router.replace(getNextScreen() as any);
  };

  // Continue after successful connection
  const handleContinue = () => {
    router.replace(getNextScreen() as any);
  };

  // Format expiration time
  const formatExpiration = (expiresAt: string): string => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) {
      return '만료됨';
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}시간 ${minutes}분 남음`;
    }
    return `${minutes}분 남음`;
  };

  // Show success state if connected
  if (connectionStatus === 'active' && couple?.partner) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <ProgressBar currentStep={2} totalSteps={3} />
          <Text style={styles.title}>파트너 연결 완료</Text>
        </View>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>파트너와 연결되었습니다!</Text>
          <Text style={styles.successEmail}>{couple.partner.email}</Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>계속하기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ProgressBar currentStep={2} totalSteps={3} />
          <Text style={styles.title}>파트너 연결</Text>
          <Text style={styles.subtitle}>
            파트너와 연결하면 함께 기록을 공유할 수 있습니다
          </Text>
        </View>

        {/* Section 1: Generate & Share Code */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>초대 코드 공유</Text>

          {!myInviteCode ? (
            <Pressable
              style={[styles.primaryButton, isGenerating && styles.buttonDisabled]}
              onPress={handleGenerateCode}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>코드 생성하기</Text>
              )}
            </Pressable>
          ) : (
            <View style={styles.codeContainer}>
              <View style={styles.codeDisplay}>
                <Text style={styles.codeText}>
                  {myInviteCode.code.split('').join(' ')}
                </Text>
              </View>

              <View style={styles.codeActions}>
                <Pressable style={styles.secondaryButton} onPress={handleCopyCode}>
                  <Text style={styles.secondaryButtonText}>
                    {copyToastVisible ? '복사됨!' : '코드 복사'}
                  </Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={handleShare}>
                  <Text style={styles.secondaryButtonText}>링크로 공유</Text>
                </Pressable>
              </View>

              <Text style={styles.expirationText}>
                {formatExpiration(myInviteCode.expires_at)}
              </Text>

              <Pressable onPress={handleGenerateCode}>
                <Text style={styles.linkText}>새 코드 생성</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Section 2: Enter Partner's Code */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>파트너 코드 입력</Text>
          <Text style={styles.inputLabel}>파트너에게 받은 코드 입력</Text>

          <TextInput
            style={styles.codeInput}
            value={inputCode}
            onChangeText={handleCodeChange}
            maxLength={6}
            placeholder="ABC123"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="default"
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[
              styles.primaryButton,
              (inputCode.length !== 6 || isConnecting) && styles.buttonDisabled,
            ]}
            onPress={handleConnect}
            disabled={inputCode.length !== 6 || isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>연결하기</Text>
            )}
          </Pressable>
        </View>

        {/* Skip Option */}
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>나중에 연결하기</Text>
        </Pressable>
      </View>

      {/* Skip Confirmation Modal */}
      <Modal
        visible={skipModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSkipModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>파트너 없이 계속하시겠습니까?</Text>
            <Text style={styles.modalMessage}>
              일부 기능은 파트너 연결 후 사용 가능합니다
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalSecondaryButton}
                onPress={() => setSkipModalVisible(false)}
              >
                <Text style={styles.modalSecondaryButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={styles.modalPrimaryButton}
                onPress={handleConfirmSkip}
              >
                <Text style={styles.modalPrimaryButtonText}>계속</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deep Link Confirmation Modal */}
      <Modal
        visible={deepLinkModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeepLinkModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>파트너의 초대 코드입니다</Text>
            <Text style={styles.modalMessage}>연결하시겠습니까?</Text>
            <View style={styles.codeDisplay}>
              <Text style={styles.codeText}>{inputCode.split('').join(' ')}</Text>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setDeepLinkModalVisible(false);
                  setInputCode('');
                }}
              >
                <Text style={styles.modalSecondaryButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalPrimaryButton, isConnecting && styles.buttonDisabled]}
                onPress={handleDeepLinkConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>연결하기</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  codeContainer: {
    alignItems: 'center',
  },
  codeDisplay: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#111827',
    letterSpacing: 4,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    width: '100%',
  },
  expirationText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#4B5563',
    textDecorationLine: 'underline',
  },
  inputLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
    color: '#111827',
  },
  primaryButton: {
    backgroundColor: '#4B5563',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  successEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  modalSecondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    flex: 1,
    backgroundColor: '#4B5563',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
