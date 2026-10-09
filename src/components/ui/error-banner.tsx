import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { useColors } from '@/constants/theme';
import { useT } from '@/lib/i18n/language';
import { Text } from './text';

/** Shows an error, translated when the message is a known one — server
 * messages arrive in English, as they do on the website. */
export function ErrorBanner({ message }: { message: string }) {
  const Colors = useColors();
  const t = useT();
  return (
    <View accessibilityRole="alert" className="flex-row items-start gap-2.5 rounded-xl bg-danger-tint p-3.5">
      <Ionicons name="alert-circle" size={18} color={Colors.danger} />
      <Text className="flex-1 text-[13.5px] leading-5 text-danger">{t(message)}</Text>
    </View>
  );
}
