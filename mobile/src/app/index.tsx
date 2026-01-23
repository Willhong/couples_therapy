import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { usePartner } from '@/hooks/usePartner';

/**
 * Root index component
 * Handles initial routing based on authentication and onboarding state
 *
 * Onboarding flow:
 * 1. Sign up/in -> questionnaire (profile & goals)
 * 2. Questionnaire complete -> partner-link
 * 3. Partner connected -> tutorial
 * 4. Tutorial complete -> home
 */
export default function Index(): React.ReactElement {
  const { user, loading: authLoading } = useAuth();
  const { connectionStatus, loading: partnerLoading } = usePartner();

  // Show loading indicator while checking auth and partner status
  if (authLoading || partnerLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4B5563" />
      </View>
    );
  }

  // Not authenticated - redirect to sign up
  if (!user) {
    return <Redirect href="/(auth)/sign-up" />;
  }

  // User exists but hasn't completed onboarding questionnaire
  // This is the first step after sign up
  if (!user.onboarding_completed) {
    return <Redirect href="/onboarding/questionnaire" />;
  }

  // Onboarding complete but partner not yet connected
  if (connectionStatus === 'none') {
    return <Redirect href="/onboarding/partner-link" />;
  }

  // User exists but hasn't completed tutorial
  if (!user.tutorial_completed) {
    return <Redirect href="/onboarding/tutorial" />;
  }

  // User exists and tutorial completed - redirect to main app
  return <Redirect href="/(main)/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
