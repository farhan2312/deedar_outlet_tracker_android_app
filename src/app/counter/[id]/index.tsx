import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { EmptyState, ErrorScreen, LoadingScreen, SectionHeader } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { useColors } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { useT, type TFunction } from '@/lib/i18n/language';
import { START_DAY_MESSAGE, type CounterAction, type CounterPage } from '@/lib/visits';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function CounterScreen() {
  const Colors = useColors();
  const t = useT();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { data, error, loading, refreshing, refresh } = useApiQuery<CounterPage>(
    `/api/mobile/counters/${encodeURIComponent(id)}`,
  );
  const title = data?.counter.name ?? name ?? t('Counter');

  if (loading && !data) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <LoadingScreen />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ErrorScreen message={error ?? 'Could not load this counter.'} onRetry={refresh} />
      </>
    );
  }

  const { counter, action, history } = data;

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-5 p-4 pb-10"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[Colors.brand]} />}>
      <Stack.Screen options={{ title: '' }} />
      {error ? <ErrorBanner message={error} /> : null}

      {/* Identity */}
      <View className="overflow-hidden rounded-3xl bg-brand p-5">
        <View className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/5" />
        <View className="flex-row items-start gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <Ionicons name="storefront" size={26} color="#fff" />
          </View>
          <View className="flex-1 gap-1.5">
            <Text weight="extrabold" className="text-[22px] leading-7 text-white">
              {counter.name}
            </Text>
            <View className="self-start rounded-full bg-white/15 px-2.5 py-1">
              <Text weight="bold" className="text-[11px] uppercase tracking-wider text-white">
                {t(counter.typeLabel)}
              </Text>
            </View>
          </View>
        </View>
        {counter.phone ? (
          <View className="mt-4 flex-row gap-2">
            <Button
              title={t('Call')}
              icon="call"
              size="sm"
              variant="light"
              onPress={() => void Linking.openURL(`tel:${counter.phone}`)}
              className="flex-1"
            />
            {counter.gps ? (
              <Button
                title={t('Directions')}
                icon="navigate"
                size="sm"
                variant="light"
                onPress={() =>
                  void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(counter.gps!)}`)
                }
                className="flex-1"
              />
            ) : null}
          </View>
        ) : null}
      </View>

      <Card className="px-4">
        <DetailRow icon="call-outline" label={t('Mobile')} value={counter.phone ?? '—'} />
        <DetailRow icon="storefront-outline" label={t('Stockist')} value={counter.stockistName} />
        <DetailRow icon="location-outline" label={t('Area/C&F')} value={`${counter.areaName}, ${counter.cnfName}`} />
        <DetailRow icon="locate-outline" label={t('GPS')} value={counter.gps ?? '—'} last />
      </Card>

      <ActionArea counterId={counter.id} action={action} t={t} />

      <View className="gap-3">
        <SectionHeader title={`${t('Visit history')} (${history.length})`} />
        {data.editWindowLeft && (
          <View className="flex-row items-center gap-2 rounded-xl bg-warning-tint px-3 py-2.5">
            <Ionicons name="time-outline" size={16} color={Colors.warning} />
            <Text className="flex-1 text-[12.5px] text-warning">
              {t("Today's visits editable for")}{' '}
              <Text weight="bold" className="text-warning">
                {data.editWindowLeft}
              </Text>{' '}
              — {t('until 11:59 PM')}
            </Text>
          </View>
        )}

        {history.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title={t('No editable visits')}
            body={t('Visits drop off here once the day ends.')}
          />
        ) : (
          history.map((h) => (
            <Card key={h.id} className="gap-3 p-4">
              <View className="flex-row items-start gap-2">
                <View className="flex-1 gap-0.5">
                  <Text weight="bold" className="text-[15px]">
                    {h.dateLabel} · {h.timeLabel}
                  </Text>
                  <Text className="text-[12.5px] text-ink-3">
                    {h.repName}
                    {h.durationLabel ? ` · ${t('Time on counter:')} ${h.durationLabel}` : ''}
                  </Text>
                </View>
                {h.editable && (
                  <Button
                    title={t('Edit')}
                    icon="pencil"
                    size="sm"
                    variant="secondary"
                    onPress={() => router.push({ pathname: '/visit/[visitId]', params: { visitId: h.id } })}
                  />
                )}
              </View>

              <View className="flex-row flex-wrap gap-2">
                {h.items.map((it, i) => (
                  <View key={i} className="min-w-[45%] flex-1 gap-0.5 rounded-2xl bg-canvas p-3">
                    <Text weight="extrabold" className="text-[13.5px] text-brand">
                      {it.segment}
                    </Text>
                    <Text className="text-[12px] text-ink-3">
                      {t('Stock')} {it.stock}
                    </Text>
                    <Text weight="bold" className={`text-[12.5px] ${it.sold > 0 ? 'text-success' : 'text-danger'}`}>
                      {t('Sold')} {it.sold}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1 rounded-2xl bg-canvas p-3">
                  <Text className="text-[11.5px] text-ink-3">{t('Deedar Rank')}</Text>
                  <Text weight="bold" className="text-[14px]">
                    {h.rankLabel}
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl bg-canvas p-3">
                  <Text className="text-[11.5px] text-ink-3">{t('Competitor')}</Text>
                  <Text weight="bold" numberOfLines={2} className="text-[14px]">
                    {competitorText(h.competitorLabel, t)}
                  </Text>
                </View>
              </View>

              {h.remarks ? <Text className="text-[13px] italic text-ink-2">“{h.remarks}”</Text> : null}
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

/** "Local Brands — Wagh Bakri": translate the label, keep the brand name. */
function competitorText(label: string, t: TFunction): string {
  const [head, ...rest] = label.split(' — ');
  return [t(head), ...rest].join(' — ');
}

function ActionArea({ counterId, action, t }: { counterId: string; action: CounterAction; t: TFunction }) {
  const Colors = useColors();
  switch (action.kind) {
    case 'add_visit':
      return (
        <Button
          title={t('Add Visit for this Counter')}
          icon="add-circle"
          onPress={() => router.push({ pathname: '/counter/[id]/visit', params: { id: counterId } })}
        />
      );
    case 'edit_today':
      return (
        <View className="gap-3 rounded-2xl bg-success-tint p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text weight="bold" className="text-[14.5px] text-success">
              {t("You've visited this counter today")}
            </Text>
          </View>
          <Button
            title={t("Edit today's visit")}
            icon="pencil"
            variant="secondary"
            onPress={() => router.push({ pathname: '/visit/[visitId]', params: { visitId: action.visitId } })}
          />
        </View>
      );
    case 'start_day_first':
      return (
        <View className="gap-3 rounded-2xl bg-warning-tint p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="sunny" size={20} color={Colors.warning} />
            <Text weight="bold" className="flex-1 text-[14px] text-warning">
              {t(START_DAY_MESSAGE)}
            </Text>
          </View>
          <Button title={t('Go to Day Log')} icon="calendar" onPress={() => router.push('/day-log')} />
        </View>
      );
    case 'visited_by_other':
      return (
        <View className="flex-row gap-3 rounded-2xl bg-surface p-4">
          <Ionicons name="people-outline" size={20} color={Colors.ink2} />
          <Text className="flex-1 text-[14px] leading-5 text-ink-2">
            <Text weight="bold">{action.byName}</Text> {t('visited this counter today at')} {action.atLabel}.{' '}
            {t('A counter is visited once a day.')}
          </Text>
        </View>
      );
    case 'not_your_stockist':
      return (
        <View className="flex-row gap-3 rounded-2xl bg-surface p-4">
          <Ionicons name="lock-closed-outline" size={20} color={Colors.ink2} />
          <Text className="flex-1 text-[14px] leading-5 text-ink-2">
            {t('This counter is in')} {action.stockistName}
            {t(", not your stockist — you can view it but can't add a visit.")}
          </Text>
        </View>
      );
  }
}

function DetailRow({ icon, label, value, last }: { icon: IconName; label: string; value: string; last?: boolean }) {
  const Colors = useColors();
  return (
    <View className={`flex-row items-center gap-3 py-3.5 ${last ? '' : 'border-b border-line-soft'}`}>
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-tint">
        <Ionicons name={icon} size={16} color={Colors.accentDark} />
      </View>
      <Text className="text-[13px] text-ink-3">{label}</Text>
      <Text weight="semibold" selectable className="flex-1 text-right text-[14px]">
        {value}
      </Text>
    </View>
  );
}
