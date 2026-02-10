/**
 * Daily Prompt Card component for home screen
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { colors, alpha } from '@/theme';
import { useDailyPrompt } from '../hooks/useDailyPrompt';
import { useAuth } from '@/hooks/useAuth';

export function DailyPromptCard() {
  const { user } = useAuth();
  const {
    assignment,
    loading,
    submitting,
    error,
    submitResponse,
    hasUserResponded,
    getUserResponse,
  } = useDailyPrompt();

  const [responseText, setResponseText] = useState('');
  const [showReveal, setShowReveal] = useState(false);
  const revealAnimation = new Animated.Value(0);

  // Check if user has responded and both partners have responded
  const userResponded = user ? hasUserResponded(user.id) : false;
  const bothResponded = assignment?.both_responded || false;
  const userResponse = user ? getUserResponse(user.id) : null;

  // Get partner's response
  const partnerResponse = assignment?.responses.find(
    (r) => r.user !== user?.id
  );

  // Handle submit
  const handleSubmit = async () => {
    if (!responseText.trim()) return;
    const success = await submitResponse(responseText.trim());
    if (success) {
      setResponseText('');
    }
  };

  // Trigger reveal animation when both responded
  useEffect(() => {
    if (bothResponded && !showReveal) {
      setShowReveal(true);
      Animated.timing(revealAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [bothResponded, showReveal]);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!assignment) {
    return null;
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>오늘의 대화 주제</Text>
        <Text style={styles.category}>{assignment.prompt.category_display}</Text>
      </View>

      {/* Prompt Question */}
      <Text style={styles.promptText}>{assignment.prompt.text_ko}</Text>

      {/* Response Input (if not responded yet) */}
      {!userResponded && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="여기에 답변을 입력하세요 (최대 500자)"
            placeholderTextColor={colors.textTertiary}
            value={responseText}
            onChangeText={setResponseText}
            multiline
            maxLength={500}
            editable={!submitting}
          />
          <Text style={styles.charCount}>
            {responseText.length}/500
          </Text>
          <Pressable
            style={[
              styles.submitButton,
              (!responseText.trim() || submitting) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!responseText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>답변하기</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Waiting for partner */}
      {userResponded && !bothResponded && (
        <View style={styles.waitingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.waitingText}>
            파트너의 답변을 기다리는 중...
          </Text>
        </View>
      )}

      {/* Reveal both responses */}
      {bothResponded && showReveal && (
        <Animated.View
          style={[
            styles.revealContainer,
            {
              opacity: revealAnimation,
              transform: [
                {
                  translateY: revealAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.revealTitle}>답변 공개!</Text>
          <View style={styles.responsesRow}>
            {/* Partner's response (left, blue) */}
            <View style={[styles.responseBox, styles.partnerResponse]}>
              <Text style={styles.responseLabel}>
                {partnerResponse?.user_email?.split('@')[0]}
              </Text>
              <Text style={styles.responseText}>
                {partnerResponse?.response_text}
              </Text>
            </View>

            {/* User's response (right, purple) */}
            <View style={[styles.responseBox, styles.userResponseBox]}>
              <Text style={styles.responseLabel}>나</Text>
              <Text style={styles.responseText}>{userResponse}</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: alpha(colors.primary, 0.1),
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  promptText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 16,
    lineHeight: 24,
  },
  inputContainer: {
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  waitingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  revealContainer: {
    marginTop: 16,
  },
  revealTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  responsesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  responseBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    minHeight: 80,
  },
  partnerResponse: {
    backgroundColor: alpha(colors.blueMedium, 0.1),
    borderWidth: 1,
    borderColor: colors.blueMedium,
  },
  userResponseBox: {
    backgroundColor: alpha(colors.primary, 0.1),
    borderWidth: 1,
    borderColor: colors.primary,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
});
