import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

const BASE = 'bg-surface rounded-2xl border border-line-soft shadow-sm shadow-black/5';

/** The standard white card. Pass `onPress` to make the whole card tappable. */
export function Card({
  children,
  className = '',
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={`${BASE} active:bg-canvas ${className}`}>
        {children}
      </Pressable>
    );
  }
  return <View className={`${BASE} ${className}`}>{children}</View>;
}
