import "@/global.css";

import { Platform } from "react-native";

/**
 * Minimal aesthetic color palette.
 * Clean neutrals, subtle separators, a single accent blue.
 * No heavy metallic or layered gray tones — just essential contrast.
 */

export const Colors = {
     light: {
          // Base
          background: "#FFFFFF",
          surface: "#F8F9FA",
          text: "#1A1A1A",
          textSecondary: "#8E8E93",
          textTertiary: "#C7C7CC",

          // Accent
          accent: "#007AFF",
          accentDimmed: "#E8F1FF",

          // UI elements
          separator: "#E5E5EA",
          highlight: "#F2F2F7",

          // Component tokens
          bubbleUser: "#E8F1FF",
          bubbleAssistant: "#F2F2F7",
          inputBackground: "#F2F2F7",
          tabBarBackground: "rgba(255,255,255,0.85)",
          overlay: "rgba(0,0,0,0.3)",

          // Semantic
          danger: "#FF3B30",
          success: "#34C759",
          warning: "#FF9500",
     },
     dark: {
          background: "#000000",
          surface: "#1C1C1E",
          text: "#F5F5F5",
          textSecondary: "#8E8E93",
          textTertiary: "#48484A",

          accent: "#0A84FF",
          accentDimmed: "#1A2A4A",

          separator: "#38383A",
          highlight: "#2C2C2E",

          bubbleUser: "#1A2A4A",
          bubbleAssistant: "#1C1C1E",
          inputBackground: "#1C1C1E",
          tabBarBackground: "rgba(0,0,0,0.85)",
          overlay: "rgba(0,0,0,0.5)",

          danger: "#FF453A",
          success: "#30D158",
          warning: "#FF9F0A",
     },
} as const satisfies Record<string, Record<string, string>>;

export type ThemeColors = typeof Colors.light;
export type ColorKey = keyof ThemeColors;

export const Spacing = {
     xs: 4,
     sm: 8,
     md: 12,
     lg: 16,
     xl: 20,
     "2xl": 24,
     "3xl": 32,
     "4xl": 48,
} as const;

export const Fonts = Platform.select({
     ios: {
          sans: "system-ui",
          serif: "ui-serif",
          rounded: "ui-rounded",
          mono: "ui-monospace",
     },
     default: {
          sans: "System",
          serif: "serif",
          rounded: "System",
          mono: "monospace",
     },
     web: {
          sans: "var(--font-sans)",
          serif: "var(--font-serif)",
          rounded: "var(--font-rounded)",
          mono: "var(--font-mono)",
     },
});

export const BorderRadius = {
     sm: 6,
     md: 10,
     lg: 14,
     xl: 20,
     full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
