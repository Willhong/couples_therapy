/**
 * Journal route - diary/journal entries for reflection
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/theme';

export default function JournalRoute(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>일기</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headingMd,
    color: colors.textPrimary,
  },
});
