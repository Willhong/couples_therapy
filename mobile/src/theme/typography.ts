import { TextStyle } from 'react-native';

export const headingFont = 'Fraunces_500Medium' as const;
export const headingFontBold = 'Fraunces_600SemiBold' as const;

export const typography = {
  headingLg: {
    fontSize: 28,
    fontWeight: '500',
    fontFamily: headingFont,
    lineHeight: 34,
  } as TextStyle,
  headingMd: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: headingFont,
    lineHeight: 28,
  } as TextStyle,
  headingSm: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: headingFont,
    lineHeight: 24,
  } as TextStyle,
  bodyLg: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } as TextStyle,
  bodyMd: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,
  bodySm: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } as TextStyle,
  captionSm: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  } as TextStyle,
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  } as TextStyle,
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  } as TextStyle,
} as const;
