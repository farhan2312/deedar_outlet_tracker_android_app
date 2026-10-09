import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { Fonts, HindiFonts } from '@/constants/theme';
import { useLanguage } from '@/lib/i18n/language';

export type TextProps = RNTextProps & {
  className?: string;
  /** Font weight — custom fonts need the family per weight on Android. */
  weight?: keyof typeof Fonts;
};

/** Has the caller picked a colour? Then the default ink must not compete with it. */
const HAS_COLOR = /(^|\s)text-(ink|white|black|brand|accent|success|warning|danger|info|gold|surface|transparent)/;

/** App text: Manrope (Noto Sans Devanagari in Hindi), dark ink by default. */
export function Text({ weight = 'medium', className = '', style, ...props }: TextProps) {
  // Opted out of the React Compiler: it cached the style array below between
  // renders, and NativeWind adds the class styles into that array — so a
  // changed class (a chip turning active) stacked on top of the old one
  // instead of replacing it (white text left on a now-white chip).
  'use no memo';
  const { lang } = useLanguage();
  const classes = HAS_COLOR.test(className) ? className : `text-ink-1 ${className}`;
  const fontFamily = (lang === 'hi' ? HindiFonts : Fonts)[weight];
  return <RNText {...props} className={classes} style={[{ fontFamily }, style]} />;
}
