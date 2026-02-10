/**
 * PerspectiveView component
 * Displays individual perspective sections in the reframing modal
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MessageSquare, Ear, ArrowLeftRight, HelpCircle } from 'lucide-react-native';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'chatbubble-outline': MessageSquare,
  'ear-outline': Ear,
  'swap-horizontal-outline': ArrowLeftRight,
  'help-circle-outline': HelpCircle,
};

interface Props {
  icon: string;
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
  const IconComponent = ICON_MAP[icon] || MessageSquare;

  return (
    <View style={[styles.section, highlight && styles.sectionHighlight]}>
      <View style={styles.header}>
        <IconComponent size={20} color={colors.primary} />
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
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHighlight: {
    backgroundColor: colors.infoBg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
    marginLeft: 8,
  },
  content: {
    fontSize: 15,
    color: colors.gray700,
    lineHeight: 22,
  },
  quoteContainer: {
    backgroundColor: colors.bgPage,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  quoteText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
