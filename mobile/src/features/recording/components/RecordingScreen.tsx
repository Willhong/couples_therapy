/**
 * Recording screen - placeholder for Task 2
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function RecordingScreen(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text>Recording Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
