/**
 * TriggerHighlight component
 * Highlights trigger phrases within text with a red-orange background.
 * Used in both transcript view and insights dashboard.
 */
import React, { useMemo } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface Props {
  text: string;
  triggerPhrases: string[];
  textStyle?: TextStyle;
}

interface TextPart {
  text: string;
  isHighlighted: boolean;
}

/**
 * Split text into parts, marking trigger phrase matches for highlighting.
 * Case-insensitive matching.
 */
function splitByTriggers(text: string, triggers: string[]): TextPart[] {
  if (triggers.length === 0) {
    return [{ text, isHighlighted: false }];
  }

  // Escape regex special chars and build pattern
  const escaped = triggers.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');

  const parts: TextPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        isHighlighted: false,
      });
    }
    // Matched trigger phrase
    parts.push({
      text: match[0],
      isHighlighted: true,
    });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      isHighlighted: false,
    });
  }

  return parts.length > 0 ? parts : [{ text, isHighlighted: false }];
}

export function TriggerHighlight({
  text,
  triggerPhrases,
  textStyle,
}: Props): React.ReactElement {
  const parts = useMemo(
    () => splitByTriggers(text, triggerPhrases),
    [text, triggerPhrases],
  );

  return (
    <Text style={textStyle}>
      {parts.map((part, index) =>
        part.isHighlighted ? (
          <Text key={index} style={styles.highlight}>
            {part.text}
          </Text>
        ) : (
          <Text key={index}>{part.text}</Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  highlight: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    color: '#C2410C',
    borderRadius: 2,
    fontWeight: '600',
  },
});
