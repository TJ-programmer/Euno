/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1E2529',
    background: '#EEF2F4',
    backgroundElement: '#E3E9EC',
    backgroundSelected: '#D5DEE3',
    textSecondary: '#5D6B73',
    // Onboarding — Dusty Blue
    onboardingBackground: '#EEF2F4',
    onboardingSurface: '#E3E9EC',
    onboardingBorder: '#CCD8DE',
    onboardingText: '#1E2529',
    onboardingTextMuted: '#5D6B73',
    onboardingAccent: '#668596',
    onboardingAccentSoft: '#DCE8EC',
    onboardingOnAccent: '#FFFFFF',
  },
  dark: {
    text: '#E8EDF0',
    background: '#111619',
    backgroundElement: '#1A232A',
    backgroundSelected: '#243039',
    textSecondary: '#8FA1AB',
    // Onboarding — Dusty Blue
    onboardingBackground: '#111619',
    onboardingSurface: '#1A232A',
    onboardingBorder: '#223038',
    onboardingText: '#E8EDF0',
    onboardingTextMuted: '#8FA1AB',
    onboardingAccent: '#7FA3B7',
    onboardingAccentSoft: '#1E2B33',
    onboardingOnAccent: '#0E1417',
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
