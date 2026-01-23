import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Record screen placeholder (Phase 3)
 */
export default function RecordScreen(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>녹음 기능은 준비 중입니다</Text>
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
