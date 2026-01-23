/**
 * Type declarations for react-native-typing-animation
 */
declare module 'react-native-typing-animation' {
  import { ComponentType } from 'react';
  import { ViewStyle } from 'react-native';

  export interface TypingAnimationProps {
    dotColor?: string;
    dotMargin?: number;
    dotAmplitude?: number;
    dotSpeed?: number;
    dotRadius?: number;
    dotX?: number;
    dotY?: number;
    style?: ViewStyle;
  }

  export const TypingAnimation: ComponentType<TypingAnimationProps>;
}
