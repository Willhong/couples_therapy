import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, typography, spacing } from '@/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'primaryGreen' | 'outline' | 'chip';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const getButtonStyle = () => {
    switch (variant) {
      case 'primaryGreen':
        return styles.primaryGreen;
      case 'outline':
        return styles.outline;
      case 'chip':
        return styles.chip;
      default:
        return styles.primary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outlineText;
      case 'chip':
        return styles.chipText;
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? colors.primary : colors.white}
        />
      ) : (
        <Text style={[styles.text, getTextStyle()]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  variant?: 'default' | 'dark' | 'filled';
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  variant = 'default',
  size = 40,
  style,
}: IconButtonProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'dark':
        return styles.iconButtonDark;
      case 'filled':
        return styles.iconButtonFilled;
      default:
        return styles.iconButtonDefault;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.iconButton,
        getVariantStyle(),
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryGreen: {
    backgroundColor: colors.success,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chip: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusFull,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 32,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button,
  },
  primaryText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.primary,
  },
  chipText: {
    color: colors.primary,
    fontSize: 14,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDefault: {
    backgroundColor: colors.transparent,
  },
  iconButtonDark: {
    backgroundColor: colors.gray800,
  },
  iconButtonFilled: {
    backgroundColor: colors.primary,
  },
});
