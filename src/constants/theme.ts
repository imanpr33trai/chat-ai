import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1C1E',
    background: '#F2F3F5',
    backgroundElement: '#E8ECF0',
    backgroundSelected: '#D4D9E0',
    textSecondary: '#6B7280',
    surface: '#FFFFFF',
    border: '#D1D5DB',
    accent: '#4A5568',
    accentLight: '#718096',
    metallicLight: '#F8F9FA',
    metallicDark: '#E2E5EA',
    metallicMid: '#D5D8DD',
    metallicBorder: '#C8CCD2',
    messageBubble: '#E8ECF0',
    messageBubbleOwn: '#D4D9E0',
    tabBarBackground: 'rgba(255,255,255,0.88)',
    inputBackground: '#E8ECF0',
    danger: '#DC3C42',
    success: '#34A853',
  },
  dark: {
    text: '#EAECEF',
    background: '#1A1C1E',
    backgroundElement: '#2C2E33',
    backgroundSelected: '#3A3C42',
    textSecondary: '#9CA3AF',
    surface: '#222428',
    border: '#33363B',
    accent: '#8B9BB5',
    accentLight: '#6B7E9A',
    metallicLight: '#2E3035',
    metallicDark: '#1E2024',
    metallicMid: '#25282D',
    metallicBorder: '#35383D',
    messageBubble: '#2C2E33',
    messageBubbleOwn: '#3A3C42',
    tabBarBackground: 'rgba(26,28,30,0.88)',
    inputBackground: '#2C2E33',
    danger: '#E5534B',
    success: '#3FB561',
  },
} as const satisfies Record<string, Record<string, string>>;

export type ThemeColors = typeof Colors.light;
export type ColorKey = keyof ThemeColors;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-sans)',
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
