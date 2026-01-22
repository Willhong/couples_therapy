import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

/**
 * Root index component
 * Handles initial routing based on authentication state
 */
export default function Index(): React.ReactElement {
  const { user, loading } = useAuth();

  // Show loading indicator while checking auth
  if (loading) {
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

  // User exists but hasn't completed tutorial - redirect to onboarding
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
