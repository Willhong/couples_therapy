/**
 * BookmarkButton component
 * Button to save current recording timestamp as a bookmark
 */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      <Ionicons name="bookmark-outline" size={24} color={disabled ? '#6B7280' : '#FFFFFF'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
