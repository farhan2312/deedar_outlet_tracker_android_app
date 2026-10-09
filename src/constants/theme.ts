import { useColorScheme } from 'nativewind';

/**
 * The design tokens as JS values — for the places a colour can't come from a
 * `className` (icon colours, headers, the tab bar). Mirrors the CSS variables
 * in `src/global.css`; keep the two in step.
 */
export const LightColors = {
  brand: '#0d3b2e',
  accent: '#7ca081',
  accentDark: '#5d796f',
  accentLight: '#a9c4ad',
  accentTint: '#e9f0ea',
  onBrand: '#ffffff',

  canvas: '#f3f6f4',
  surface: '#ffffff',
  line: '#e3e9e5',
  lineSoft: '#edf1ee',

  ink1: '#17221d',
  ink2: '#5b6660',
  ink3: '#98a29c',

  success: '#1e9e5a',
  warning: '#b25e00',
  danger: '#c7263b',
  info: '#2e5fa3',
  gold: '#e0a100',
};

export type Palette = typeof LightColors;

export const DarkColors: Palette = {
  brand: '#1f7a5c',
  accent: '#7ca081',
  accentDark: '#8fb39a',
  accentLight: '#a9c4ad',
  accentTint: '#1d2b24',
  onBrand: '#ffffff',

  canvas: '#0e1311',
  surface: '#161d1a',
  line: '#27312c',
  lineSoft: '#1e2723',

  ink1: '#e6ece9',
  ink2: '#a1aca6',
  ink3: '#6f7b75',

  success: '#3ccf7f',
  warning: '#f0a63a',
  danger: '#f06a7a',
  info: '#6f9fe0',
  gold: '#f0c040',
};

/** The light palette — for code outside React (the map page, the location
 * notification) where the theme doesn't apply. Components use `useColors()`. */
export const Colors = LightColors;

/** Whether the app is showing its dark theme right now. */
export function useIsDark(): boolean {
  return useColorScheme().colorScheme === 'dark';
}

/** The palette for the current theme (My account → Theme). */
export function useColors(): Palette {
  return useIsDark() ? DarkColors : LightColors;
}

/** Manrope — the web portal's typeface. Loaded in the root layout. */
export const Fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/** Used instead of Manrope when the app is in Hindi: Manrope has no
 * Devanagari, and the phone's fallback font ignores the weight, so Hindi
 * headings came out regular. Noto Sans Devanagari has Latin too, so mixed
 * text ("9:12 AM से काम पर") still matches. */
export const HindiFonts: Record<keyof typeof Fonts, string> = {
  regular: 'NotoSansDevanagari_400Regular',
  medium: 'NotoSansDevanagari_500Medium',
  semibold: 'NotoSansDevanagari_600SemiBold',
  bold: 'NotoSansDevanagari_700Bold',
  extrabold: 'NotoSansDevanagari_800ExtraBold',
};
