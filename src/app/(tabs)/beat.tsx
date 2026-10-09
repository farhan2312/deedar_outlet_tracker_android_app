import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Fab } from '@/components/ui/fab';
import { EmptyState, ErrorScreen, LoadingScreen, SectionHeader } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Fonts, useColors } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/auth/session';
import type { Beat, BeatCounter, CounterSearchResult } from '@/lib/beat';
import { useT } from '@/lib/i18n/language';

function openCounter(id: string, name: string) {
  router.push({ pathname: '/counter/[id]', params: { id, name } });
}

export default function BeatScreen() {
  const Colors = useColors();
  const t = useT();
  const { data, error, loading, refreshing, refresh } = useApiQuery<Beat>('/api/mobile/beat');

  if (loading && !data) return <LoadingScreen />;
  if (!data) return <ErrorScreen message={error ?? "Could not load today's beat."} onRetry={refresh} />;

  const total = data.assigned ? data.beat.length : 0;
  const done = data.assigned ? total - data.remaining : 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-4 pb-28 pt-1"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[Colors.brand]} />}>
        {error ? <ErrorBanner message={error} /> : null}

        {!data.assigned ? (
          <EmptyState icon="business-outline" title={t('No stockist yet')} body={t(data.message)} />
        ) : (
          <>
            {/* Progress */}
            <View className="overflow-hidden rounded-3xl bg-brand p-5">
              <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
              <Text weight="semibold" className="text-[13px] text-white/70">
                {t("Today's progress")}
              </Text>
              <View className="mt-1 flex-row items-end gap-2">
                <Text weight="extrabold" className="text-[34px] leading-10 text-white">
                  {done}
                  <Text weight="bold" className="text-[18px] text-white/60">
                    /{total}
                  </Text>
                </Text>
                <Text className="mb-1.5 text-[13px] text-white/70">{t('counters done')}</Text>
              </View>
              <View className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                <View className="h-2 rounded-full bg-accent-light" style={{ width: `${pct}%` }} />
              </View>
              <View className="mt-4 flex-row gap-3">
                <MiniStat label={t('Visits today')} value={data.visitsToday} />
                <MiniStat label={t('Added today')} value={data.newCountersToday} />
                <MiniStat label={t('Remaining')} value={data.remaining} />
              </View>
            </View>

            <PhoneSearch />

            <SectionHeader
              title={t("Today's Beat")}
              right={<Badge label={t('{n} remaining', { n: data.remaining })} tone="brand" />}
            />

            {data.beat.length === 0 ? (
              <EmptyState
                icon="flag-outline"
                title={data.isAdmin ? t('No beats today') : t('No counters assigned yet')}
                body={
                  data.isAdmin
                    ? t('No beats assigned across the company today yet.')
                    : t('Your Sales Officer (SO) sets your daily beat.')
                }
              />
            ) : (
              <View className="gap-2.5">
                {data.beat.map((c, i) => (
                  <BeatRow key={c.key} counter={c} index={i + 1} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
      {data.assigned && <Fab icon="add" label={t('New counter')} onPress={() => router.push('/new-counter')} />}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 rounded-2xl bg-white/10 px-3 py-2.5">
      <Text weight="extrabold" className="text-[18px] text-white">
        {value}
      </Text>
      <Text numberOfLines={1} className="text-[11px] text-white/70">
        {label}
      </Text>
    </View>
  );
}

function BeatRow({ counter: c, index }: { counter: BeatCounter; index: number }) {
  const Colors = useColors();
  const t = useT();
  const done = c.visitedToday || !!c.lockedBy;
  return (
    <Card
      className="flex-row items-center gap-3 p-3.5"
      onPress={() => openCounter(c.id, c.name)}
      accessibilityLabel={`${c.name}, ${done ? t('Open') : t('Check in')}`}>
      <View
        className={`h-11 w-11 items-center justify-center rounded-2xl ${
          c.visitedToday ? 'bg-success-tint' : c.lockedBy ? 'bg-canvas' : 'bg-accent-tint'
        }`}>
        {c.visitedToday ? (
          <Ionicons name="checkmark" size={22} color={Colors.success} />
        ) : (
          <Text weight="extrabold" className={`text-[15px] ${c.lockedBy ? 'text-ink-3' : 'text-brand'}`}>
            {index}
          </Text>
        )}
      </View>
      <View className="flex-1 gap-1">
        <Text weight="bold" numberOfLines={1} className={`text-[15px] ${done ? 'text-ink-2' : 'text-ink-1'}`}>
          {c.name}
        </Text>
        <Text numberOfLines={1} className="text-[12.5px] text-ink-3">
          {t(c.type)} · {c.areaName}
          {c.repName ? ` · ${c.repName}` : ''}
        </Text>
        {c.visitedToday ? (
          <Badge label={t('Visited')} tone="success" dot />
        ) : c.lockedBy ? (
          <Badge label={t('Done by {name}', { name: c.lockedBy })} tone="neutral" />
        ) : null}
      </View>
      {done ? (
        <Ionicons name="chevron-forward" size={18} color={Colors.ink3} />
      ) : (
        <View className="rounded-xl bg-brand px-3.5 py-2">
          <Text weight="bold" className="text-[12.5px] text-white">
            {t('Check in')}
          </Text>
        </View>
      )}
    </Card>
  );
}

/** Find a counter by mobile — at your stockist you can check in; at another
 * stockist it only confirms the number is taken; not found means it's new. */
function PhoneSearch() {
  const Colors = useColors();
  const t = useT();
  const { authedApi } = useSession();
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<CounterSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  async function search() {
    if (searching) return;
    setError('');
    if (!/^\d{10}$/.test(phone)) {
      setResult({ found: false });
      return;
    }
    setSearching(true);
    try {
      setResult(await authedApi<CounterSearchResult>(`/api/mobile/counters/search?phone=${encodeURIComponent(phone)}`));
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <Card className="gap-3 p-4">
      <Text weight="bold" className="text-[14px]">
        {t('Find a counter by mobile number')}
      </Text>
      <View className="flex-row gap-2">
        <View className="h-12 flex-1 flex-row items-center gap-2 rounded-2xl border border-line bg-canvas px-3.5">
          <Ionicons name="call-outline" size={17} color={Colors.ink3} />
          <TextInput
            value={phone}
            onChangeText={(text) => {
              setPhone(text.replace(/\D/g, ''));
              setResult(null);
              setError('');
            }}
            placeholder={t('10-digit mobile')}
            placeholderTextColor={Colors.ink3}
            keyboardType="phone-pad"
            maxLength={10}
            returnKeyType="search"
            onSubmitEditing={search}
            className="flex-1 text-[15px] text-ink-1"
            style={{ fontFamily: Fonts.medium }}
          />
        </View>
        <Pressable
          onPress={search}
          disabled={searching}
          accessibilityRole="button"
          accessibilityLabel={t('Search')}
          className={`h-12 w-12 items-center justify-center rounded-2xl bg-brand active:opacity-80 ${searching ? 'opacity-60' : ''}`}>
          {searching ? <ActivityIndicator color="#fff" /> : <Ionicons name="search" size={20} color="#fff" />}
        </Pressable>
      </View>

      {error ? <ErrorBanner message={error} /> : null}

      {result ? (
        !result.found ? (
          <View className="flex-row items-center justify-between rounded-2xl bg-canvas p-3.5">
            <Text className="flex-1 text-[13.5px] text-ink-2">{t('No counter with this number.')}</Text>
            <Pressable onPress={() => router.push('/new-counter')} accessibilityRole="link" hitSlop={8}>
              <Text weight="bold" className="text-[13.5px] text-brand">
                {t('Add it →')}
              </Text>
            </Pressable>
          </View>
        ) : result.canVisit ? (
          <Pressable
            onPress={() => openCounter(result.id, result.name)}
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-2xl bg-accent-tint p-3.5 active:opacity-80">
            <View className="flex-1 gap-0.5">
              <Text weight="bold" numberOfLines={1} className="text-[14.5px]">
                {result.name}
              </Text>
              <Text numberOfLines={2} className="text-[12px] text-ink-2">
                {t(result.type)} · {result.area} · {result.stockistName}
              </Text>
            </View>
            <View className="rounded-xl bg-brand px-3.5 py-2">
              <Text weight="bold" className="text-[12.5px] text-white">
                {t('Check in')}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View className="rounded-2xl bg-warning-tint p-3.5">
            <Text className="text-[13px] leading-5 text-warning">
              {t("This mobile is registered to a counter at another stockist — you can't access it from here.")}
            </Text>
          </View>
        )
      ) : !error ? (
        <Text className="text-[12px] leading-[18px] text-ink-3">
          {t('Found at your stockist: check in. At another stockist: not accessible. Not found: add it as a new counter.')}
        </Text>
      ) : null}
    </Card>
  );
}
