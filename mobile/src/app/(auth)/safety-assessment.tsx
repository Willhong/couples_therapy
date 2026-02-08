/**
 * Safety Assessment screen route
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { SafetyAssessment } from '@/features/safety/components/SafetyAssessment';

export default function SafetyAssessmentScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: '안전 평가',
          headerShown: true,
        }}
      />
      <SafetyAssessment />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
