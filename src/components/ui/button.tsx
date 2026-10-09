import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { type Palette, useColors } from '@/constants/theme';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';

const BOX: Record<Variant, string> = {
  primary: 'bg-brand',
  secondary: 'bg-surface border border-line',
  ghost: 'bg-transparent',
  danger: 'bg-danger-tint',
  light: 'bg-white/15 border border-white/25',
};
const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-ink-1',
  ghost: 'text-brand',
  danger: 'text-danger',
  light: 'text-white',
};
const iconColor = (variant: Variant, Colors: Palette): string =>
  ({
    primary: '#ffffff',
    secondary: Colors.ink1,
    ghost: Colors.brand,
    danger: Colors.danger,
    light: '#ffffff',
  })[variant];

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Shows a spinner and ignores taps. */
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  className = '',
}: ButtonProps) {
  const Colors = useColors();
  const icon_ = iconColor(variant, Colors);
  const inactive = disabled || loading;
  const height = size === 'sm' ? 'min-h-[38px] px-3.5 rounded-xl' : 'min-h-[52px] px-5 rounded-2xl';

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      className={`${height} ${BOX[variant]} flex-row items-center justify-center active:opacity-80 ${
        inactive ? 'opacity-50' : ''
      } ${className}`}>
      {loading ? (
        <ActivityIndicator color={icon_} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={icon_} />}
          <Text weight="bold" className={`${size === 'sm' ? 'text-[13px]' : 'text-[15px]'} ${LABEL[variant]}`}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
