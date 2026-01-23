import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Insights screen placeholder (Phase 2)
 */
export default function InsightsScreen(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>인사이트 기능은 준비 중입니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 16,
    color: '#6B7280',
  },
});
