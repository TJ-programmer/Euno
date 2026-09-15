/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#17171A',
    background: '#FAFAFA',
    backgroundElement: '#F0EEF5',
    backgroundSelected: '#E4DFF5',
    textSecondary: '#6B6B74',
    // Onboarding — Midnight
    onboardingBackground: '#FAFAFA',
    onboardingSurface: '#F0EEF5',
    onboardingBorder: '#E1DEEA',
    onboardingText: '#17171A',
    onboardingTextMuted: '#6B6B74',
    onboardingAccent: '#6A46FF',
    onboardingAccentSoft: '#EDE7FF',
    onboardingOnAccent: '#FFFFFF',
  },
  dark: {
    text: '#F5F5F7',
    background: '#121214',
    backgroundElement: '#1D1D20',
    backgroundSelected: '#26262C',
    textSecondary: '#9A9AA2',
    // Onboarding — Midnight
    onboardingBackground: '#121214',
    onboardingSurface: '#1D1D20',
    onboardingBorder: '#2C2C31',
    onboardingText: '#F5F5F7',
    onboardingTextMuted: '#9A9AA2',
    onboardingAccent: '#7C5CFF',
    onboardingAccentSoft: '#2A2140',
    onboardingOnAccent: '#FFFFFF',
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
