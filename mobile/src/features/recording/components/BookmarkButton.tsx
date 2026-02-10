/**
 * BookmarkButton component
 * Button to save current recording timestamp as a bookmark
 */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { colors, alpha } from '@/theme';

interface Props {
  onBookmark: () => void;
  disabled?: boolean;
}

export function BookmarkButton({ onBookmark, disabled = false }: Props): React.ReactElement {
  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPress={onBookmark}
      disabled={disabled}
      hitSlop={12}
    >
      <Bookmark size={24} color={disabled ? colors.textSecondary : colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: alpha(colors.white, 0.2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
