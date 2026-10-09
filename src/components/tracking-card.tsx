import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { type Palette, useColors } from '@/constants/theme';
import { useTracking } from '@/hooks/use-tracking';
import { useT, type TFunction } from '@/lib/i18n/language';
import { isExpoGo, syncTracking } from '@/lib/tracking/tracker';

function agoLabel(at: number, now: number, t: TFunction): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return t('just now');
  const m = Math.round(s / 60);
  return m < 60 ? t('{n} min ago', { n: m }) : t('{n} h ago', { n: Math.round(m / 60) });
}

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

const toneStyle = (tone: Tone, Colors: Palette) =>
  ({
    success: { box: 'bg-success-tint border-success/20', icon: Colors.success, iconBg: 'bg-success/15' },
    warning: { box: 'bg-warning-tint border-warning/20', icon: Colors.warning, iconBg: 'bg-warning/15' },
    danger: { box: 'bg-danger-tint border-danger/20', icon: Colors.danger, iconBg: 'bg-danger/15' },
    neutral: { box: 'bg-surface border-line-soft', icon: Colors.ink3, iconBg: 'bg-canvas' },
  })[tone];

/** Live location status, with the one action that fixes it when it's wrong. */
export function TrackingCard({ hideWhenOff = false }: { hideWhenOff?: boolean }) {
  const Colors = useColors();
  const tracking = useTracking();
  const t = useT();
  // Re-render every 30 s so "updated … ago" stays honest.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (tracking.state === 'off' && hideWhenOff) return null;

  const view: {
    tone: Tone;
    icon: ComponentProps<typeof Ionicons>['name'];
    title: string;
    body: string;
    action?: { label: string; onPress: () => void };
  } = (() => {
    switch (tracking.state) {
      case 'live':
        return tracking.background || isExpoGo
          ? {
              tone: 'success' as const,
              icon: 'radio' as const,
              title: isExpoGo ? t('Live location on (app open)') : t('Live location on'),
              body: tracking.lastSentAt
                ? t('Shared with your Sales Officer · updated {ago}', { ago: agoLabel(tracking.lastSentAt, now, t) })
                : t('Shared with your Sales Officer'),
            }
          : {
              tone: 'warning' as const,
              icon: 'phone-portrait-outline' as const,
              title: t('Sharing only while app is open'),
              body: t('Allow location all the time to keep sharing with the screen off.'),
              action: { label: t('Allow'), onPress: () => router.push('/location-permission') },
            };
      case 'connecting':
        return {
          tone: 'warning' as const,
          icon: 'cloud-offline-outline' as const,
          title: t('Connecting…'),
          body: t('Will share as soon as the network is back.'),
        };
      case 'needs_permission':
        return {
          tone: 'danger' as const,
          icon: 'location-outline' as const,
          title: t('Location access needed'),
          body: t('Your day is open, but location is off for this app.'),
          action: { label: t('Turn on'), onPress: () => router.push('/location-permission') },
        };
      case 'blocked':
        return {
          tone: 'neutral' as const,
          icon: 'phone-portrait-outline' as const,
          title: t('Shared from another device'),
          body: tracking.message ? t(tracking.message) : '',
        };
      case 'error':
        return {
          tone: 'danger' as const,
          icon: 'warning-outline' as const,
          title: t("Couldn't start sharing"),
          body: t(tracking.message ?? 'Check your connection.'),
          action: { label: t('Retry'), onPress: () => void syncTracking() },
        };
      default:
        return {
          tone: 'neutral' as const,
          icon: 'navigate-outline' as const,
          title: t('Location sharing is off'),
          body: t(tracking.message ?? 'It starts when you start your day.'),
        };
    }
  })();

  const tone = toneStyle(view.tone, Colors);

  return (
    <View accessibilityRole="summary" className={`flex-row items-center gap-3 rounded-2xl border p-3.5 ${tone.box}`}>
      <View className={`h-10 w-10 items-center justify-center rounded-xl ${tone.iconBg}`}>
        <Ionicons name={view.icon} size={19} color={tone.icon} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text weight="bold" className="text-[14px]">
          {view.title}
        </Text>
        {view.body ? <Text className="text-[12.5px] leading-[17px] text-ink-2">{view.body}</Text> : null}
      </View>
      {view.action && <Button title={view.action.label} size="sm" onPress={view.action.onPress} />}
    </View>
  );
}
