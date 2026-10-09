import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Lang } from '@/lib/i18n/dictionary';
import { useLanguage } from '@/lib/i18n/language';

const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'hi', label: 'हिं' },
];

/**
 * EN / हिं pill — the website's language toggle. `onDark` for the brand-green
 * screens (sign-in, the Home hero), otherwise for light headers.
 */
export function LanguageToggle({ onDark = false }: { onDark?: boolean }) {
  const { lang, setLang } = useLanguage();
  return (
    <View
      accessibilityRole="radiogroup"
      className={`flex-row rounded-full p-1 ${onDark ? 'border border-white/25 bg-white/10' : 'border border-line bg-surface'}`}>
      {OPTIONS.map((o) => {
        const active = o.value === lang;
        const box = active ? (onDark ? 'bg-white' : 'bg-brand') : '';
        const text = active ? (onDark ? 'text-brand' : 'text-white') : onDark ? 'text-white' : 'text-ink-2';
        return (
          <Pressable
            key={o.value}
            onPress={() => setLang(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.value === 'en' ? 'English' : 'हिंदी'}
            className={`h-8 min-w-[40px] items-center justify-center rounded-full px-2.5 ${box}`}>
            <Text weight="bold" className={`text-[12.5px] ${text}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
