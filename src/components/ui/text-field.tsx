import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type Ref } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { Fonts, useColors } from '@/constants/theme';
import { useT } from '@/lib/i18n/language';
import { Text } from './text';

type TextFieldProps = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label?: string;
  ref?: Ref<TextInput>;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Hides the text and adds a show/hide toggle. */
  password?: boolean;
  hint?: string;
};

export function TextField({
  label,
  ref,
  icon,
  password,
  hint,
  editable = true,
  multiline,
  ...inputProps
}: TextFieldProps) {
  const Colors = useColors();
  const t = useT();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View className="gap-1.5">
      {label ? (
        <Text weight="semibold" className="text-[13.5px] text-ink-1">
          {label}
        </Text>
      ) : null}
      <View
        className={`flex-row gap-2.5 rounded-2xl border px-4 ${multiline ? 'items-start py-1' : 'min-h-[52px] items-center'} ${
          focused ? 'border-brand bg-surface' : 'border-line bg-surface'
        } ${editable ? '' : 'bg-canvas'}`}>
        {icon && (
          <View className={multiline ? 'pt-3' : ''}>
            <Ionicons name={icon} size={19} color={focused ? Colors.brand : Colors.ink3} />
          </View>
        )}
        <TextInput
          {...inputProps}
          ref={ref}
          editable={editable}
          multiline={multiline}
          secureTextEntry={password && !revealed}
          placeholderTextColor={Colors.ink3}
          className={`flex-1 py-2.5 text-[15.5px] text-ink-1 ${multiline ? 'min-h-[72px]' : ''}`}
          style={{ fontFamily: Fonts.medium, textAlignVertical: multiline ? 'top' : 'center' }}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
        {password && (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('Hide password') : t('Show password')}>
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.ink3} />
          </Pressable>
        )}
      </View>
      {hint ? <Text className="text-[12px] text-ink-3">{hint}</Text> : null}
    </View>
  );
}
