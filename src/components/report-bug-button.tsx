import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { LanguageToggle } from '@/components/language-toggle';
import { useColors } from '@/constants/theme';
import { useT } from '@/lib/i18n/language';

/** The bug icon (in a header, or over the Home hero) that opens "Report a
 * Bug" — the website's top-bar button. `from` names the screen. */
export function ReportBugButton({ from, onDark }: { from: string; onDark?: boolean }) {
  const Colors = useColors();
  const t = useT();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/report-bug', params: { from } })}
      accessibilityRole="button"
      accessibilityLabel={t('Report a Bug')}
      hitSlop={8}
      className={`h-10 w-10 items-center justify-center rounded-full active:opacity-70 ${
        onDark ? 'border border-white/30 bg-white/15' : 'border border-line bg-surface'
      }`}>
      <Ionicons name="bug-outline" size={19} color={onDark ? '#fff' : Colors.danger} />
    </Pressable>
  );
}

/** Language toggle, then the bug button — the top-right of every tab. */
export function HeaderActions({ from, onDark }: { from: string; onDark?: boolean }) {
  return (
    <View className={`flex-row items-center gap-2 ${onDark ? '' : 'mr-4'}`}>
      <LanguageToggle onDark={onDark} />
      <ReportBugButton from={from} onDark={onDark} />
    </View>
  );
}
