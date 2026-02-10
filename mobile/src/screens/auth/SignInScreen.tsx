import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

/**
 * Sign in screen with email and password
 */
export function SignInScreen(): React.ReactElement {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isFormValid = email.length > 0 && password.length > 0;

  const handleSignIn = useCallback(async () => {
    if (!isFormValid || loading) return;

    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      // Navigate to index which will redirect based on user state
      router.replace('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';

      // Check for common error cases and show appropriate Korean message
      if (message.includes('credentials') || message.includes('401') || message.includes('invalid')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, signIn, isFormValid, loading]);

  const navigateToSignUp = useCallback(() => {
    router.replace('/(auth)/sign-up');
  }, [router]);

  const handleForgotPassword = useCallback(() => {
    Alert.prompt(
      '비밀번호 찾기',
      '가입하신 이메일 주소를 입력해주세요.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '전송',
          onPress: async (resetEmail?: string) => {
            if (!resetEmail || resetEmail.trim().length === 0) {
              Alert.alert('오류', '이메일을 입력해주세요.');
              return;
            }

            try {
              await api.post('/auth/password/reset/', { email: resetEmail.trim() });
              Alert.alert(
                '이메일 전송 완료',
                '비밀번호 재설정 이메일을 발송했습니다. 이메일을 확인해주세요.'
              );
            } catch (err) {
              const message = err instanceof Error ? err.message : '비밀번호 재설정 요청에 실패했습니다.';
              Alert.alert('오류', message);
            }
          },
        },
      ],
      'plain-text',
      '',
      'email-address'
    );
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>로그인</Text>
          <Text style={styles.subtitle}>
            다시 돌아오셨군요! 계속 진행하세요.
          </Text>
        </View>

        <View style={styles.form}>
          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>이메일</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
                placeholder="example@email.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
                placeholder="비밀번호 입력"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Forgot Password Link */}
          <Pressable onPress={handleForgotPassword} style={styles.forgotContainer}>
            <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
          </Pressable>

          {/* Sign In Button */}
          <Pressable
            style={[
              styles.button,
              (!isFormValid || loading) && styles.buttonDisabled,
            ]}
            onPress={handleSignIn}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>로그인</Text>
            )}
          </Pressable>
        </View>

        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>계정이 없으신가요? </Text>
          <Pressable onPress={navigateToSignUp}>
            <Text style={styles.footerLink}>회원가입</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: headingFont,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: colors.errorBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
