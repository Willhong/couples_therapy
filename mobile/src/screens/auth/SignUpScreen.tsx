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
import { useAuth } from '@/hooks/useAuth';
import { DisclaimerCheckbox } from './components/DisclaimerCheckbox';

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
    // TODO: Navigate to terms screen
    Alert.alert('이용약관', '이용약관 페이지는 준비 중입니다.');
  }, []);

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
          <Text style={styles.title}>회원가입</Text>
          <Text style={styles.subtitle}>
            CouplesAI와 함께 더 나은 대화를 시작하세요
          </Text>
        </View>

        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              value={email}
              onChangeText={setEmail}
              onBlur={() => setEmailTouched(true)}
              placeholder="example@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              value={password}
              onChangeText={setPassword}
              onBlur={() => setPasswordTouched(true)}
              placeholder="8자 이상 입력"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
            />
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              style={[styles.input, confirmError ? styles.inputError : null]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onBlur={() => setConfirmTouched(true)}
              placeholder="비밀번호를 다시 입력"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
            />
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
              <ActivityIndicator color="#FFFFFF" />
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
    backgroundColor: '#FFFFFF',
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
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#4B5563',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
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
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
});
