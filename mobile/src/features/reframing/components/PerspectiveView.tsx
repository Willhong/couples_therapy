/**
 * PerspectiveView component
 * Displays individual perspective sections in the reframing modal
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  content: string;
  quotes?: string[];
  highlight?: boolean;
}

export function PerspectiveView({
  icon,
  title,
  content,
  quotes,
  highlight,
}: Props): React.ReactElement {
  return (
    <View style={[styles.section, highlight && styles.sectionHighlight]}>
      <View style={styles.header}>
        <Ionicons name={icon} size={20} color="#6B7FD7" />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.content}>{content}</Text>
      {quotes?.map((quote, index) => (
        <View key={index} style={styles.quoteContainer}>
          <Text style={styles.quoteText}>"{quote}"</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHighlight: {
    backgroundColor: '#F0F4FF',
    borderLeftWidth: 4,
    borderLeftColor: '#6B7FD7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  content: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  quoteContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  quoteText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
