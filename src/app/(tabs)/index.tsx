import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { HeaderActions } from '@/components/report-bug-button';
import { TrackingCard } from '@/components/tracking-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, SectionHeader } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { type Palette, useColors } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { useSession } from '@/lib/auth/session';
import type { Beat } from '@/lib/beat';
import type { DayLog } from '@/lib/day-log';
import { useT, type TFunction } from '@/lib/i18n/language';

type IconName = ComponentProps<typeof Ionicons>['name'];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function Home() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const t = useT();
  const dayLog = useApiQuery<DayLog>('/api/mobile/day-log');
  const beat = useApiQuery<Beat>('/api/mobile/beat');

  if (session.status !== 'signedIn') return null;
  const { user } = session;
  const firstName = user.name.split(/\s+/)[0];
  const today = dayLog.data?.today;
  const beatData = beat.data?.assigned ? beat.data : null;
  const nextUp = beatData?.beat.filter((c) => !c.visitedToday && !c.lockedBy).slice(0, 3) ?? [];

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="pb-10"
      refreshControl={
        <RefreshControl
          refreshing={dayLog.refreshing || beat.refreshing}
          onRefresh={() => {
            dayLog.refresh();
            beat.refresh();
          }}
          colors={[Colors.brand]}
          progressViewOffset={insets.top}
        />
      }>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <View className="overflow-hidden rounded-b-[32px] bg-brand px-5 pb-16" style={{ paddingTop: insets.top + 14 }}>
        <View className="absolute -right-16 -top-10 h-56 w-56 rounded-full bg-white/5" />
        <View className="absolute -left-10 top-40 h-36 w-36 rounded-full bg-accent/10" />
        <View className="absolute right-10 top-28 h-20 w-20 rounded-full bg-white/5" />

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <BrandMark size="sm" />
            <Text weight="extrabold" className="text-[17px] text-white">
              D-Drive
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <HeaderActions from="index" onDark />
            <Pressable
              onPress={() => router.push('/account')}
              accessibilityRole="button"
              accessibilityLabel={t('My account')}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15 active:opacity-80">
              <Text weight="bold" className="text-[14px] text-white">
                {initials(user.name)}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text className="mt-6 text-[14px] text-white/70">{dayLog.data?.todayLabel ?? ' '}</Text>
        <Text weight="extrabold" className="mt-1 text-[26px] leading-8 text-white">
          {t(dayLog.data?.greeting ?? 'Hello')}, {firstName}
        </Text>
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Ionicons name="storefront-outline" size={13} color="rgba(255,255,255,0.7)" />
          <Text numberOfLines={1} className="flex-1 text-[13px] text-white/70">
            {user.depot?.name ?? t('No stockist assigned')}
          </Text>
        </View>

        <DayStatus today={today} t={t} />
      </View>

      <View className="-mt-10 gap-5 px-4">
        {/* ── Today in numbers ───────────────────────────────── */}
        <View className="flex-row gap-3">
          <Stat icon="checkmark-done" tone="success" value={beatData?.visitsToday} label={t('Visits today')} />
          <Stat icon="flag" tone="info" value={beatData?.remaining} label={t('Left on beat')} />
          <Stat icon="cube" tone="gold" value={today?.soldTotal} label={t('Sold today')} />
        </View>

        <TrackingCard />

        {/* ── Quick actions ─────────────────────────────────── */}
        <View className="gap-3">
          <SectionHeader title={t('Quick actions')} />
          <View className="flex-row flex-wrap gap-3">
            <Action icon="add-circle" label={t('New counter')} sub={t('Add a shop')} href="/new-counter" tone="brand" />
            <Action icon="search" label={t('Find counter')} sub={t('By name or mobile')} href="/counters" tone="info" />
            <Action icon="navigate" label={t('Live map')} sub={t('Nearest first')} href="/map" tone="success" />
            <Action icon="calendar" label={t('Day Log')} sub={t('Stock & timings')} href="/day-log" tone="gold" />
          </View>
        </View>

        {/* ── Next on the beat ──────────────────────────────── */}
        <View className="gap-3">
          <SectionHeader
            title={t('Next on your beat')}
            right={
              beatData && beatData.beat.length > 0 ? (
                <Pressable onPress={() => router.push('/beat')} hitSlop={8} accessibilityRole="link">
                  <Text weight="bold" className="text-[13px] text-brand">
                    {t('See all')}
                  </Text>
                </Pressable>
              ) : null
            }
          />
          {beat.data && !beat.data.assigned ? (
            <EmptyState icon="business-outline" title={t('No stockist yet')} body={t(beat.data.message)} />
          ) : beatData && beatData.beat.length === 0 ? (
            <EmptyState
              icon="flag-outline"
              title={t('No beat assigned today')}
              body={t('Your Sales Officer sets your daily beat. You can still visit any counter from All Counters.')}
            />
          ) : beatData && nextUp.length === 0 ? (
            <EmptyState icon="trophy-outline" title={t('Beat complete!')} body={t("Every counter on today's beat is done. Great work.")} />
          ) : (
            nextUp.map((c) => (
              <Card
                key={c.key}
                className="flex-row items-center gap-3 p-3.5"
                onPress={() => router.push({ pathname: '/counter/[id]', params: { id: c.id, name: c.name } })}
                accessibilityLabel={t('Check in at {name}', { name: c.name })}>
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-tint">
                  <Ionicons name="storefront" size={20} color={Colors.accentDark} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text weight="bold" numberOfLines={1} className="text-[15px]">
                    {c.name}
                  </Text>
                  <Text numberOfLines={1} className="text-[12.5px] text-ink-3">
                    {t(c.type)} · {c.areaName}
                  </Text>
                </View>
                <Badge label={t('Check in')} tone="brand" />
              </Card>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

/** The day's state inside the hero, with the next step. */
function DayStatus({ today, t }: { today: DayLog['today'] | undefined; t: TFunction }) {
  if (!today) return <View className="mt-5 h-[76px] rounded-3xl bg-white/10" />;

  const { title, body, icon, cta } = !today.started
    ? {
        title: t("Your day hasn't started"),
        body: t('Start it to log visits and share your location.'),
        icon: 'sunny-outline' as IconName,
        cta: t('Start day'),
      }
    : !today.ended
      ? {
          title: t('On the job since {time}', { time: today.startLabel }),
          body: t('{picked} packets picked up · {sold} sold', { picked: today.pickupTotal, sold: today.soldTotal }),
          icon: 'pulse' as IconName,
          cta: t('End day'),
        }
      : {
          title: t('Day complete'),
          body: t('On job {time} · sold {sold} packets', { time: today.onJobLabel, sold: today.soldTotal }),
          icon: 'checkmark-circle' as IconName,
          cta: null,
        };

  return (
    <View className="mt-5 flex-row items-center gap-3 rounded-3xl border border-white/15 bg-white/10 p-4">
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text weight="bold" className="text-[15px] text-white">
          {title}
        </Text>
        <Text className="text-[12.5px] text-white/70">{body}</Text>
      </View>
      {cta && <Button title={cta} size="sm" variant="light" onPress={() => router.push('/day-log')} />}
    </View>
  );
}

const TONE_BG = {
  brand: 'bg-accent-tint',
  info: 'bg-info-tint',
  success: 'bg-success-tint',
  gold: 'bg-gold-tint',
} as const;
const toneIcon = (tone: keyof typeof TONE_BG, Colors: Palette): string =>
  ({ brand: Colors.brand, info: Colors.info, success: Colors.success, gold: Colors.gold })[tone];

function Stat({
  icon,
  tone,
  value,
  label,
}: {
  icon: IconName;
  tone: keyof typeof TONE_BG;
  value: number | undefined;
  label: string;
}) {
  const Colors = useColors();
  return (
    <Card className="flex-1 gap-2 p-3.5">
      <View className={`h-8 w-8 items-center justify-center rounded-xl ${TONE_BG[tone]}`}>
        <Ionicons name={icon} size={16} color={toneIcon(tone, Colors)} />
      </View>
      <Text weight="extrabold" className="text-[22px] leading-7">
        {value ?? '–'}
      </Text>
      <Text weight="semibold" numberOfLines={1} className="text-[11.5px] text-ink-3">
        {label}
      </Text>
    </Card>
  );
}

function Action({
  icon,
  label,
  sub,
  href,
  tone,
}: {
  icon: IconName;
  label: string;
  sub: string;
  href: Href;
  tone: keyof typeof TONE_BG;
}) {
  const Colors = useColors();
  return (
    <Card className="w-[48%] flex-grow gap-3 p-4" onPress={() => router.push(href)} accessibilityLabel={label}>
      <View className={`h-11 w-11 items-center justify-center rounded-2xl ${TONE_BG[tone]}`}>
        <Ionicons name={icon} size={22} color={toneIcon(tone, Colors)} />
      </View>
      <View className="gap-0.5">
        <Text weight="bold" className="text-[15px]">
          {label}
        </Text>
        <Text className="text-[12px] text-ink-3">{sub}</Text>
      </View>
    </Card>
  );
}
