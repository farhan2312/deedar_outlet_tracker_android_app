import { View } from 'react-native';

import { Text } from './text';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'neutral' | 'brand';

const TONES: Record<Tone, { box: string; text: string; dot: string }> = {
  success: { box: 'bg-success-tint', text: 'text-success', dot: 'bg-success' },
  warning: { box: 'bg-warning-tint', text: 'text-warning', dot: 'bg-warning' },
  danger: { box: 'bg-danger-tint', text: 'text-danger', dot: 'bg-danger' },
  info: { box: 'bg-info-tint', text: 'text-info', dot: 'bg-info' },
  gold: { box: 'bg-gold-tint', text: 'text-warning', dot: 'bg-gold' },
  neutral: { box: 'bg-canvas', text: 'text-ink-2', dot: 'bg-ink-3' },
  brand: { box: 'bg-accent-tint', text: 'text-brand', dot: 'bg-brand' },
};

/** A small rounded status pill. */
export function Badge({ label, tone = 'neutral', dot }: { label: string; tone?: Tone; dot?: boolean }) {
  const t = TONES[tone];
  return (
    <View className={`flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 ${t.box}`}>
      {dot && <View className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
      <Text weight="bold" className={`text-[11px] ${t.text}`}>
        {label}
      </Text>
    </View>
  );
}
