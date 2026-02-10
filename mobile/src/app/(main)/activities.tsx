/**
 * Activities route - displays activities and exercises for the couple
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/theme';

export default function ActivitiesRoute(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>활동</Text>
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
