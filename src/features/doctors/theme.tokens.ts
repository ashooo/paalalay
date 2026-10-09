/**
 * Local Linaw Theme Tokens (Variant A)
 * Sourced directly from repo root design.md Section 11.
 * 
 * [TEAM NOTE]: Flagged for review with Dev 1, Dev 2, and Dev 4 so the team can
 * adopt a centralized src/theme/ module for the entire app.
 */

export const linawTheme = {
  name: 'Linaw',
  colors: {
    light: {
      background: '#F4F8F9',
      surface: '#FFFFFF',
      surfaceVariant: '#E3EFF1',
      primary: '#0B6E79',
      onPrimary: '#FFFFFF',
      secondary: '#3A5A8C',
      accent: '#1E8C88',
      text: '#10272C',
      textMuted: '#4C6368',
      border: '#C6D7DA',
      success: '#1F7A4D',
      warning: '#8A5A00',
      error: '#B3261E',
      info: '#1E5FA8',
      chart_blood_pressure: '#0072B2',
      chart_blood_sugar: '#B36B00',
      chart_temperature: '#C2410C',
      chart_weight: '#007A5A',
      chart_symptom: '#A64D86',
      status_taken: '#1F7A4D',
      status_skipped: '#5E7074',
      status_missed: '#8A5A00',
    },
    dark: {
      background: '#0B181B',
      surface: '#132428',
      surfaceVariant: '#1B3236',
      primary: '#5FD0D6',
      onPrimary: '#00363B',
      secondary: '#A9C3F0',
      accent: '#7EDCD3',
      text: '#E6F2F3',
      textMuted: '#9DB5B9',
      border: '#2E474B',
      success: '#6FD39A',
      warning: '#F2C063',
      error: '#FFB4AB',
      info: '#9CC7FF',
      chart_blood_pressure: '#56B4E9',
      chart_blood_sugar: '#F0B840',
      chart_temperature: '#F08A4B',
      chart_weight: '#3CC79A',
      chart_symptom: '#E3A0C8',
      status_taken: '#6FD39A',
      status_skipped: '#9DB5B9',
      status_missed: '#F2C063',
    },
  },
  typography: {
    fontFamily: {
      heading: 'Manrope',
      body: 'Manrope',
      numeric: 'Manrope',
    },
    scale: {
      display: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const, family: 'heading' },
      title: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const, family: 'heading' },
      subtitle: { fontSize: 18, lineHeight: 26, fontWeight: '600' as const, family: 'body' },
      body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const, family: 'body' },
      label: { fontSize: 16, lineHeight: 20, fontWeight: '600' as const, family: 'body' },
      caption: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, family: 'body' },
      reading: { fontSize: 40, lineHeight: 48, fontWeight: '700' as const, family: 'numeric' },
    },
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    pill: 999,
  },
  elevation: {
    level0: 0,
    level1: 1,
    level2: 3,
    level3: 6,
  },
  borderWidth: 1,
  touchTarget: {
    min: 48,
    comfortable: 48,
  },
  screenPadding: 16,
  icon: {
    size: 24,
    strokeWidth: 1.75,
  },
} as const;

export type LinawTheme = typeof linawTheme;
export type LinawColorScheme = keyof typeof linawTheme.colors;
export const getLinawColors = (scheme: LinawColorScheme = 'light') => linawTheme.colors[scheme];
