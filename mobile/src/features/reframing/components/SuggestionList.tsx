/**
 * SuggestionList component
 * Displays numbered suggestions for improving communication
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  suggestions: string[];
}

export function SuggestionList({ suggestions }: Props): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={20} color="#6B7FD7" />
        <Text style={styles.title}>다음에 시도해볼 것</Text>
      </View>
      {suggestions.map((suggestion, index) => (
        <View key={index} style={styles.item}>
          <View style={styles.numberCircle}>
            <Text style={styles.number}>{index + 1}</Text>
          </View>
          <Text style={styles.text}>{suggestion}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  numberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6B7FD7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  number: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
});
