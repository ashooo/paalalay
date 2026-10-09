/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
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
    // Fallback aliases for template components
    backgroundElement: '#E3EFF1',
    backgroundSelected: '#C6D7DA',
    textSecondary: '#4C6368',
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
    // Fallback aliases for template components
    backgroundElement: '#1B3236',
    backgroundSelected: '#2E474B',
    textSecondary: '#9DB5B9',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
