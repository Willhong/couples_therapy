/**
 * Design tokens — all colors used in the app.
 * Pencil design system (15 tokens) + extended functional colors.
 */

export function alpha(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const colors = {
  // ── Pencil design tokens (15) ──────────────────────────
  bgAiMessage: '#F5F3EF',
  bgCard: '#FFFFFF',
  bgPage: '#FAF8F5',
  bgSystem: '#FEF3C7',
  border: '#E8E4DF',
  error: '#EF4444',
  primary: '#7C9082',
  primaryLight: '#E8EFEA',
  success: '#10B981',
  successBg: '#D1FAE5',
  textPrimary: '#2D2D2D',
  textSecondary: '#8A8A8A',
  textTertiary: '#ADADAD',
  warning: '#92400E',
  warningBg: '#FEF3C7',

  // ── Extended functional colors ─────────────────────────
  errorBg: '#FEF2F2',
  infoBg: '#EFF6FF',
  infoText: '#1E40AF',
  dangerText: '#991B1B',
  dangerTextDark: '#7F1D1D',
  primaryBg: '#E8EFEA',
  blueMedium: '#3B82F6',
  warningAmber: '#F59E0B',
  warningDark: '#C2410C',
  purple: '#7C3AED',
  purpleBg: '#F5F3FF',

  // ── Extended grays ─────────────────────────────────────
  gray800: '#1F2937',
  gray700: '#374151',
  gray600: '#4B5563',
  gray300: '#D1D5DB',

  // ── Home-screen warm accents ───────────────────────────
  accentWarm: '#C4A092',
  accentSage: '#7C9082',

  // ── Chip / Nav ────────────────────────────────────────
  chipBg: '#F5F3EF',
  navBorder: '#E8E4DF',

  // ── Utility ────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;
