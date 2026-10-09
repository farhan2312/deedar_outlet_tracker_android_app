import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { Text } from './text';

/** Floating action button, bottom-right above the tab bar. */
export function Fab({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="absolute bottom-5 right-5 h-14 flex-row items-center gap-2 rounded-full bg-brand px-5 shadow-lg shadow-black/25 active:opacity-90">
      <Ionicons name={icon} size={22} color="#fff" />
      <Text weight="bold" className="text-[14px] text-white">
        {label}
      </Text>
    </Pressable>
  );
}
