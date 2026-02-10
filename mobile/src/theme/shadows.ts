import { Platform, ViewStyle } from 'react-native';

function shadow(
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number,
): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
  }) as ViewStyle;
}

export const shadows = {
  sm: shadow(1, 0.05, 4, 2),
  md: shadow(2, 0.1, 8, 4),
  lg: shadow(4, 0.15, 12, 8),
} as const;
