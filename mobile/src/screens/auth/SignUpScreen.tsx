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
import { DisclaimerCheckbox } from './components/DisclaimerCheckbox';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

// Current disclaimer version - update when terms change
const DISCLAIMER_VERSION = '1.0';

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sign up screen with email, password, and disclaimer acceptance
 */
export function SignUpScreen(): React.ReactElement {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  // Validation errors
  const emailError = emailTouched && !isValidEmail(email)
    ? '이메일 형식이 올바르지 않습니다'
    : '';
  const passwordError = passwordTouched && password.length < 8
    ? '비밀번호는 8자 이상이어야 합니다'
    : '';
  const confirmError = confirmTouched && password !== confirmPassword
    ? '비밀번호가 일치하지 않습니다'
    : '';

  // Check if form is valid
  const isFormValid =
    isValidEmail(email) &&
    password.length >= 8 &&
    password === confirmPassword &&
    disclaimerChecked;

  const handleSignUp = useCallback(async () => {
    if (!isFormValid || loading) return;

    setLoading(true);
    try {
      await signUp(email, password, DISCLAIMER_VERSION);
      // Navigate to index which will redirect based on user state
      router.replace('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : '회원가입에 실패했습니다.';

      // Check for common error cases
      if (message.includes('already') || message.includes('이미')) {
        Alert.alert('회원가입 실패', '이미 등록된 이메일입니다.');
      } else {
        Alert.alert('회원가입 실패', message);
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, signUp, isFormValid, loading]);

  const handleTermsPress = useCallback(() => {
    router.push('/(auth)/terms' as any);
  }, [router]);

  const navigateToSignIn = useCallback(() => {
    router.replace('/(auth)/sign-in');
  }, [router]);

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
          <Text style={styles.title}>계정 만들기</Text>
          <Text style={styles.subtitle}>
            더 강한 관계를 위한 여정을 시작하세요
          </Text>
        </View>

        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>이메일</Text>
            <View style={[styles.inputWrapper, emailError ? styles.inputError : null]}>
              <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                onBlur={() => setEmailTouched(true)}
                placeholder="example@email.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
            </View>
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호</Text>
            <View style={[styles.inputWrapper, passwordError ? styles.inputError : null]}>
              <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                onBlur={() => setPasswordTouched(true)}
                placeholder="8자 이상 입력"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </Pressable>
            </View>
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호 확인</Text>
            <View style={[styles.inputWrapper, confirmError ? styles.inputError : null]}>
              <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onBlur={() => setConfirmTouched(true)}
                placeholder="비밀번호를 다시 입력"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                {showConfirmPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </Pressable>
            </View>
            {confirmError ? (
              <Text style={styles.errorText}>{confirmError}</Text>
            ) : null}
          </View>

          {/* Disclaimer Checkbox */}
          <DisclaimerCheckbox
            checked={disclaimerChecked}
            onChange={setDisclaimerChecked}
            onTermsPress={handleTermsPress}
          />

          {/* Sign Up Button */}
          <Pressable
            style={[
              styles.button,
              (!isFormValid || loading) && styles.buttonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>회원가입</Text>
            )}
          </Pressable>
        </View>

        {/* Sign In Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
          <Pressable onPress={navigateToSignIn}>
            <Text style={styles.footerLink}>로그인</Text>
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
    fontSize: 26,
    fontWeight: '500',
    fontFamily: headingFont,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
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
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 16,
    color: colors.textPrimary,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  button: {
    backgroundColor: colors.textPrimary,
    borderRadius: 28,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
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
