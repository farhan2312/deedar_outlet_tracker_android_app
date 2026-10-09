import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { TrackingCard } from '@/components/tracking-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { QtyInput } from '@/components/ui/qty-input';
import { EmptyState, ErrorScreen, LoadingScreen, SectionHeader } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { type Palette, useColors } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/auth/session';
import { totalOf, zeroQty, type DayLog, type Product, type SkuQty } from '@/lib/day-log';
import { getDeviceId } from '@/lib/device-id';
import { useT } from '@/lib/i18n/language';
import { missingTrackingPermission, syncTracking } from '@/lib/tracking/tracker';

type Panel = null | 'pickup' | 'remaining';
type IconName = ComponentProps<typeof Ionicons>['name'];

export default function DayLogScreen() {
  const Colors = useColors();
  const t = useT();
  const { session, authedApi } = useSession();
  const { data, setData, error, loading, refreshing, refresh } = useApiQuery<DayLog>('/api/mobile/day-log');

  const [panel, setPanel] = useState<Panel>(null);
  const [draft, setDraft] = useState<SkuQty>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (loading && !data) return <LoadingScreen />;
  if (!data) return <ErrorScreen message={error ?? 'Could not load your day log.'} onRetry={refresh} />;

  const { today, products } = data;
  const firstName = session.status === 'signedIn' ? session.user.name.split(/\s+/)[0] : '';

  function openPanel(next: Exclude<Panel, null>) {
    setSubmitError('');
    if (panel === next) {
      setPanel(null);
      return;
    }
    setDraft(zeroQty(products));
    setPanel(next);
  }

  async function confirm() {
    if (submitting || !panel) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const next =
        panel === 'pickup'
          ? await authedApi<DayLog>('/api/mobile/day-log/start', {
              method: 'POST',
              body: { deviceId: await getDeviceId(), pickup: draft },
            })
          : await authedApi<DayLog>('/api/mobile/day-log/end', {
              method: 'POST',
              body: { remaining: draft },
            });
      setData(next);
      setPanel(null);
      // Starting opens live location (asking for access first if this phone
      // hasn't given it); ending closes it.
      if (panel === 'pickup' && (await missingTrackingPermission())) {
        router.push('/location-permission');
      } else {
        void syncTracking();
      }
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-5 px-4 pb-10 pt-1"
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[Colors.brand]} />}>
      {error ? <ErrorBanner message={error} /> : null}

      <View className="gap-1">
        <Text weight="extrabold" className="text-[22px]">
          {t(data.greeting)}, {firstName}!
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={14} color={Colors.ink3} />
          <Text className="text-[13.5px] text-ink-2">{data.todayLabel}</Text>
        </View>
      </View>

      {/* Today's plan — a two-step timeline */}
      <Card className="p-4">
        <View className="mb-1 flex-row items-center justify-between">
          <Text weight="extrabold" className="text-[17px]">
            {t("Today's Plan")}
          </Text>
          {today.ended ? (
            <Badge label={t('Complete')} tone="success" dot />
          ) : today.started ? (
            <Badge label={t('On the job')} tone="brand" dot />
          ) : (
            <Badge label={t('Not started')} tone="neutral" />
          )}
        </View>

        <Step
          icon="play"
          done={today.started}
          title={t('Start of day')}
          value={t(today.startLabel)}
          detail={today.started ? t('Picked up {n} packets', { n: today.pickupTotal }) : t('Count the stock you carry out')}
          action={
            !today.started
              ? { label: panel === 'pickup' ? t('Close') : t('Start'), secondary: panel === 'pickup', onPress: () => openPanel('pickup') }
              : null
          }
          disabled={submitting}
          connector
        />
        {panel === 'pickup' && !today.started && (
          <StockPanel
            title={t('Stock picked up from your stockist')}
            hint={t('Packets you are carrying out today. Enter 0 for anything you did not take.')}
            products={products}
            qty={draft}
            onChange={setDraft}
            confirmLabel={t('Start day')}
            onConfirm={confirm}
            onCancel={() => setPanel(null)}
            busy={submitting}
            error={submitError}
          />
        )}

        <Step
          icon="stop"
          done={today.ended}
          title={t('End of day')}
          value={t(today.endLabel)}
          detail={today.ended ? t('{n} packets left over', { n: today.remainingTotal }) : t('Count what is left in your bag')}
          action={
            today.started && !today.ended
              ? { label: panel === 'remaining' ? t('Close') : t('End'), secondary: panel === 'remaining', onPress: () => openPanel('remaining') }
              : null
          }
          disabled={submitting}
        />
        {panel === 'remaining' && today.started && !today.ended && (
          <StockPanel
            title={t('Stock remaining at end of day')}
            hint={t('Packets still with you. Expected = picked up − sold today.')}
            products={products}
            qty={draft}
            onChange={setDraft}
            expected={today.expectedRemaining}
            confirmLabel={t('End day')}
            onConfirm={confirm}
            onCancel={() => setPanel(null)}
            busy={submitting}
            error={submitError}
          />
        )}

        {today.started && (
          <View className="mt-3 flex-row gap-2">
            <Figure label={t('Picked up')} value={today.pickupTotal} />
            <Figure label={t('Sold')} value={today.soldTotal} />
            <Figure label={today.ended ? t('Remaining') : t('On job')} value={today.ended ? today.remainingTotal : today.onJobLabel} />
          </View>
        )}
      </Card>

      {today.started && !today.ended && <TrackingCard />}

      {/* This week */}
      <View className="gap-3">
        <SectionHeader title={t('This week')} />
        <View className="flex-row gap-3">
          <WeekStat icon="calendar" tone="brand" value={String(data.week.daysLogged)} label={t('Days logged')} />
          <WeekStat icon="time" tone="success" value={data.week.onJobLabel} label={t('On the job')} />
          <WeekStat icon="flame" tone="gold" value={`${data.week.pct}%`} label={t('Attendance')} />
        </View>
      </View>

      {/* Previous days */}
      <View className="gap-3">
        <SectionHeader title={t('Previous days')} />
        {data.history.length === 0 ? (
          <EmptyState icon="time-outline" title={t('No previous days yet')} body={t('Your last 7 days will show here.')} />
        ) : (
          <Card className="px-4">
            {data.history.map((h, i) => (
              <View
                key={h.logDate}
                className={`flex-row items-center gap-3 py-3.5 ${i > 0 ? 'border-t border-line-soft' : ''}`}>
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-canvas">
                  <Ionicons name="calendar-clear-outline" size={18} color={Colors.ink2} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text weight="bold" className="text-[14.5px]">
                    {h.dateLabel}
                  </Text>
                  <Text className="text-[12.5px] text-ink-3">
                    {h.startLabel} – {h.endLabel} · {t('picked {n}', { n: h.pickupTotal || '—' })} ·{' '}
                    {t('left {n}', { n: h.remainingTotal || '—' })}
                  </Text>
                </View>
                {h.onJobLabel !== '—' && <Badge label={h.onJobLabel} tone="success" />}
              </View>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

function Step({
  icon,
  done,
  title,
  value,
  detail,
  action,
  disabled,
  connector,
}: {
  icon: IconName;
  done: boolean;
  title: string;
  value: string;
  detail: string;
  action: { label: string; secondary: boolean; onPress: () => void } | null;
  disabled: boolean;
  connector?: boolean;
}) {
  const Colors = useColors();
  return (
    <View className="flex-row gap-3 pt-3">
      <View className="items-center">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${done ? 'bg-brand' : 'border-2 border-line bg-surface'}`}>
          <Ionicons name={done ? 'checkmark' : icon} size={done ? 20 : 15} color={done ? '#fff' : Colors.accentDark} />
        </View>
        {connector && <View className={`mt-1 w-0.5 flex-1 ${done ? 'bg-brand' : 'bg-line'}`} />}
      </View>
      <View className="flex-1 flex-row items-center gap-2 pb-3">
        <View className="flex-1 gap-0.5">
          <Text weight="bold" className="text-[15px]">
            {title}
          </Text>
          <Text weight="semibold" className={`text-[13px] ${done ? 'text-brand' : 'text-ink-3'}`}>
            {value}
          </Text>
          <Text className="text-[12px] text-ink-3">{detail}</Text>
        </View>
        {action && (
          <Button
            title={action.label}
            size="sm"
            variant={action.secondary ? 'secondary' : 'primary'}
            onPress={action.onPress}
            disabled={disabled}
          />
        )}
      </View>
    </View>
  );
}

function Figure({ label, value }: { label: string; value: number | string }) {
  return (
    <View className="flex-1 rounded-2xl bg-canvas px-3 py-2.5">
      <Text weight="extrabold" className="text-[17px]">
        {value}
      </Text>
      <Text className="text-[11.5px] text-ink-3">{label}</Text>
    </View>
  );
}

const TONE_BG = { brand: 'bg-accent-tint', success: 'bg-success-tint', gold: 'bg-gold-tint' } as const;
const toneIcon = (tone: keyof typeof TONE_BG, Colors: Palette): string =>
  ({ brand: Colors.brand, success: Colors.success, gold: Colors.gold })[tone];

function WeekStat({
  icon,
  tone,
  value,
  label,
}: {
  icon: IconName;
  tone: keyof typeof TONE_BG;
  value: string;
  label: string;
}) {
  const Colors = useColors();
  return (
    <Card className="flex-1 gap-2 p-3.5">
      <View className={`h-8 w-8 items-center justify-center rounded-xl ${TONE_BG[tone]}`}>
        <Ionicons name={icon} size={16} color={toneIcon(tone, Colors)} />
      </View>
      <Text weight="extrabold" numberOfLines={1} className="text-[18px]">
        {value}
      </Text>
      <Text weight="semibold" numberOfLines={1} className="text-[11.5px] text-ink-3">
        {label}
      </Text>
    </Card>
  );
}

/** Per-SKU packet counts for one end of the day. Confirming is what actually
 * starts or ends the day — the time and the count are saved together. */
function StockPanel({
  title,
  hint,
  products,
  qty,
  onChange,
  expected,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
  error,
}: {
  title: string;
  hint: string;
  products: Product[];
  qty: SkuQty;
  onChange: (next: SkuQty) => void;
  expected?: SkuQty;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string;
}) {
  const t = useT();
  return (
    <View className="mb-3 ml-[52px] gap-2 rounded-2xl bg-accent-tint p-4">
      <View className="flex-row items-baseline justify-between gap-2">
        <Text weight="bold" className="flex-1 text-[14px]">
          {title}
        </Text>
        <Text weight="bold" className="text-[13px] text-brand">
          {t('{n} pkts', { n: totalOf(qty) })}
        </Text>
      </View>
      <Text className="text-[12px] leading-[17px] text-ink-2">{hint}</Text>

      {products.map((p) => (
        <View key={p.value} className="flex-row items-center justify-between border-b border-line-soft py-1.5">
          <View>
            <Text weight="semibold" className="text-[14.5px]">
              {p.label}
            </Text>
            {expected && <Text className="text-[11.5px] text-ink-3">{t('Expected {n}', { n: expected[p.value] ?? 0 })}</Text>}
          </View>
          <QtyInput
            value={qty[p.value] ?? 0}
            onChange={(n) => onChange({ ...qty, [p.value]: n })}
            disabled={busy}
            accessibilityLabel={p.label}
          />
        </View>
      ))}

      {error ? <ErrorBanner message={error} /> : null}

      <View className="mt-1 flex-row gap-2.5">
        <Button title={t('Cancel')} variant="secondary" onPress={onCancel} disabled={busy} className="flex-1" />
        <Button title={confirmLabel} onPress={onConfirm} loading={busy} className="flex-1" />
      </View>
    </View>
  );
}
