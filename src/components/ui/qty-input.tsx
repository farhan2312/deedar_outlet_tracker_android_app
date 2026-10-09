import { useState } from 'react';
import { TextInput } from 'react-native';

import { Fonts, useColors } from '@/constants/theme';

/**
 * A packet-count box: whole numbers, never negative, prefilled with 0.
 *
 * Keeps a text draft while typing (like the website's QtyInput) so the box can
 * sit empty mid-edit instead of snapping back to 0, and typing over the 0
 * gives "98" rather than "098".
 */
export function QtyInput({
  value,
  onChange,
  disabled,
  accessibilityLabel,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const Colors = useColors();
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <TextInput
      value={draft ?? String(value)}
      onChangeText={(text) => {
        const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
        setDraft(digits);
        onChange(digits === '' ? 0 : Number(digits));
      }}
      onBlur={() => setDraft(null)}
      selectTextOnFocus
      keyboardType="number-pad"
      maxLength={5}
      editable={!disabled}
      accessibilityLabel={accessibilityLabel}
      placeholderTextColor={Colors.ink3}
      className={`h-11 w-[76px] rounded-xl border border-line text-center text-[16px] text-ink-1 ${
        disabled ? 'bg-canvas' : 'bg-surface'
      }`}
      style={{ fontFamily: Fonts.bold }}
    />
  );
}
