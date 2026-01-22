import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { usePartner } from '@/hooks/usePartner';

/**
 * Root index component
 * Handles initial routing based on authentication and partner connection state
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

  // User exists but hasn't completed onboarding (no partner and not skipped)
  // Check if partner connection is needed
  if (!user.onboarding_completed && connectionStatus === 'none') {
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
