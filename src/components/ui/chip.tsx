import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';

import { Text } from './text';

/** A selectable pill — filters, single choices. */
export function Chip({
  label,
  active,
  onPress,
  role = 'button',
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  role?: 'button' | 'radio';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={{ selected: active }}
      className={`min-h-[38px] flex-row items-center gap-1 rounded-full border px-4 ${
        active ? 'border-brand bg-brand' : 'border-line bg-surface active:bg-canvas'
      }`}>
      {active && role === 'radio' && <Ionicons name="checkmark" size={14} color="#fff" />}
      <Text weight="semibold" className={`text-[13px] ${active ? 'text-white' : 'text-ink-2'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
