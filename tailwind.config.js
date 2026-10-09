/**
 * Design tokens for the app. Brand colours follow the web portal (the deep
 * green of its sign-in page, the sage accent of its sidebar); the neutrals are
 * a soft green-grey so the whole app reads as one family.
 *
 * Every colour is a CSS variable (defined in `src/global.css`, with a light
 * and a dark value), so the dark theme needs no `dark:` variants anywhere —
 * the same classes simply resolve to the other palette.
 *
 * Keep `src/constants/theme.ts` in step — it holds the same values for the
 * places that need a colour as a JS value (icons, headers, the tab bar).
 *
 * @type {import('tailwindcss').Config}
 */
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

module.exports = {
  // The theme is chosen in the app (My account → Theme) via NativeWind's
  // colorScheme.set(); 'class' mode lets that work in browser previews too.
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: v('brand') },
        accent: {
          DEFAULT: v('accent'),
          dark: v('accent-dark'),
          light: v('accent-light'),
          tint: v('accent-tint'),
        },
        canvas: v('canvas'),
        surface: v('surface'),
        line: v('line'),
        'line-soft': v('line-soft'),
        ink: {
          1: v('ink-1'),
          2: v('ink-2'),
          3: v('ink-3'),
        },
        success: { DEFAULT: v('success'), tint: v('success-tint') },
        warning: { DEFAULT: v('warning'), tint: v('warning-tint') },
        danger: { DEFAULT: v('danger'), tint: v('danger-tint') },
        info: { DEFAULT: v('info'), tint: v('info-tint') },
        gold: { DEFAULT: v('gold'), tint: v('gold-tint') },
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
