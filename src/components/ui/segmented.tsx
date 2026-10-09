import { Pressable, View } from 'react-native';

import { Text } from './text';

/** A row of mutually exclusive choices — the website's `Segmented`. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" className="flex-row gap-1 rounded-2xl bg-canvas p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled }}
            // No shadow on the active option: shadow classes set CSS variables,
            // and adding variables after the first render makes NativeWind
            // remount the component and (in development) crash while logging
            // a warning about it — "Couldn't find a navigation context".
            className={`min-h-[42px] flex-1 items-center justify-center rounded-xl px-1 ${active ? 'bg-brand' : ''}`}>
            <Text weight="bold" numberOfLines={1} className={`text-[13px] ${active ? 'text-white' : 'text-ink-2'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
