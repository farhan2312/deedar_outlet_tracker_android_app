import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { QtyInput } from '@/components/ui/qty-input';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useColors } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n/language';
import type { VisitFormOptions, VisitInput, VisitItem } from '@/lib/visits';

type Counts = Record<string, number>;

function countsFrom(products: VisitFormOptions['products'], items: VisitItem[] | undefined, key: 'sold' | 'stock') {
  const m: Counts = Object.fromEntries(products.map((p) => [p.value, 0]));
  for (const it of items ?? []) if (it.segment in m) m[it.segment] = it[key];
  return m;
}

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * The visit form — the website's `VisitForm` for an ISR: packets sold and
 * counter stock per product, our rank, competitor presence, remarks, then a
 * review step before anything is written.
 *
 * Creating also runs the "time on counter" timer from when the form opened.
 * `onSubmit` throws an `ApiError` to show a message; on success the caller
 * navigates away, so the form stays busy.
 */
export function VisitForm({
  mode,
  counterName,
  counterSubtitle,
  options,
  initial,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  counterName: string;
  counterSubtitle: string;
  options: VisitFormOptions;
  initial?: {
    items: VisitItem[];
    rank: number | null;
    competitor: string | null;
    competitorBrand: string;
    remarks: string;
  };
  onSubmit: (input: VisitInput) => Promise<void>;
  onCancel: () => void;
}) {
  const Colors = useColors();
  const t = useT();
  const { products, competitors, ranks } = options;
  const isEdit = mode === 'edit';
  const scrollRef = useRef<ScrollView>(null);

  const [sold, setSold] = useState<Counts>(() => countsFrom(products, initial?.items, 'sold'));
  const [stock, setStock] = useState<Counts>(() => countsFrom(products, initial?.items, 'stock'));
  const [rank, setRank] = useState<number | null>(initial ? initial.rank : 1);
  const [competitor, setCompetitor] = useState(initial?.competitor ?? 'none');
  const [competitorBrand, setCompetitorBrand] = useState(initial?.competitorBrand ?? '');
  const [remarks, setRemarks] = useState(initial?.remarks ?? '');
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (isEdit) return;
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isEdit]);

  const totalSold = products.reduce((s, p) => s + (sold[p.value] ?? 0), 0);
  const competitorLabel = competitors.find((c) => c.value === competitor)?.label ?? competitor;

  function goTo(next: 'form' | 'review') {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  async function submit() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        items: products.map((p) => ({ segment: p.value, stock: stock[p.value] ?? 0, sold: sold[p.value] ?? 0 })),
        rank,
        competitor,
        competitorBrand,
        remarks,
        durationSeconds: isEdit ? null : elapsed,
      });
      // Success: the caller navigates away — stay busy so a second tap can't
      // record the visit twice.
    } catch (err) {
      setBusy(false);
      goTo('form');
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <ScrollView ref={scrollRef} className="flex-1 bg-canvas" contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
      {/* Counter + timer */}
      <View className="overflow-hidden rounded-3xl bg-brand p-5">
        <View className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/5" />
        {!isEdit && (
          <View className="mb-3 flex-row items-center gap-1.5 self-start rounded-full bg-white/15 px-2.5 py-1">
            <View className="h-2 w-2 rounded-full bg-accent-light" />
            <Text weight="bold" className="text-[11.5px] text-white">
              {t('Checked in')}
            </Text>
          </View>
        )}
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text weight="extrabold" numberOfLines={2} className="text-[19px] leading-6 text-white">
              {counterName}
            </Text>
            <Text className="mt-0.5 text-[12.5px] text-white/70">{counterSubtitle}</Text>
          </View>
          {!isEdit && (
            <View className="items-end">
              <Text weight="extrabold" className="text-[28px] text-white" style={{ fontVariant: ['tabular-nums'] }}>
                {mmss(elapsed)}
              </Text>
              <Text className="text-[11px] text-white/70">{t('time on counter')}</Text>
            </View>
          )}
        </View>
      </View>

      <StepDots step={step} />

      {step === 'form' ? (
        <>
          <Card className="p-4">
            <View className="mb-1 flex-row items-baseline justify-between">
              <Text weight="extrabold" className="text-[16px]">
                {t('Packets sold & stock')}
              </Text>
              <Text weight="bold" className="text-[13px] text-brand">
                {t('{n} sold', { n: totalSold })}
              </Text>
            </View>
            {products.map((p, i) => (
              <View key={p.value} className={`gap-2.5 py-3.5 ${i > 0 ? 'border-t border-line-soft' : ''}`}>
                <Text weight="bold" className="text-[15px]">
                  {p.label}
                </Text>
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <View className="flex-row items-center gap-2">
                    <Text weight="semibold" className="text-[12px] text-ink-3">
                      {t('Sold').toUpperCase()}
                    </Text>
                    <Stepper
                      value={sold[p.value] ?? 0}
                      onChange={(n) => setSold((prev) => ({ ...prev, [p.value]: n }))}
                      label={`${p.label} ${t('Sold')}`}
                    />
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text weight="semibold" className="text-[12px] text-ink-3">
                      {t('Stock').toUpperCase()}
                    </Text>
                    <QtyInput
                      value={stock[p.value] ?? 0}
                      onChange={(n) => setStock((prev) => ({ ...prev, [p.value]: n }))}
                      accessibilityLabel={`${p.label} ${t('Stock')}`}
                    />
                  </View>
                </View>
              </View>
            ))}
          </Card>

          <Card className="gap-3 p-4">
            <Text weight="extrabold" className="text-[16px]">
              {t('Our rank at this counter')}
            </Text>
            <Segmented
              options={ranks.map((r) => ({ value: r === null ? 'na' : String(r), label: r === null ? t('N/A') : String(r) }))}
              value={rank === null ? 'na' : String(rank)}
              onChange={(v) => setRank(v === 'na' ? null : Number(v))}
            />
          </Card>

          <Card className="gap-3 p-4">
            <Text weight="extrabold" className="text-[16px]">
              {t('Competitor presence *')}
            </Text>
            <Segmented
              options={competitors.map((c) => ({ value: c.value, label: t(c.label) }))}
              value={competitor}
              onChange={(v) => {
                setCompetitor(v);
                // Drop a leftover brand when switching back to "None", as the
                // server does on save.
                if (v === 'none') setCompetitorBrand('');
              }}
            />
            {competitor !== 'none' && (
              <TextField
                icon="pricetag-outline"
                value={competitorBrand}
                onChangeText={setCompetitorBrand}
                placeholder={t('Name the competitor brand')}
                maxLength={80}
              />
            )}
          </Card>

          <Card className="gap-3 p-4">
            <Text weight="extrabold" className="text-[16px]">
              {t('Remarks (optional)')}
            </Text>
            <TextField
              value={remarks}
              onChangeText={setRemarks}
              placeholder={t('e.g. asked for bigger visi-cooler')}
              multiline
            />
          </Card>

          {error ? <ErrorBanner message={error} /> : null}

          <View className="flex-row gap-3">
            <Button title={t('Cancel')} variant="secondary" onPress={onCancel} className="flex-1" />
            <Button
              title={t('Review')}
              icon="arrow-forward"
              onPress={() => {
                setError('');
                goTo('review');
              }}
              className="flex-1"
            />
          </View>
        </>
      ) : (
        <>
          <View className="flex-row gap-2.5 rounded-2xl bg-warning-tint p-3.5">
            <Ionicons name="eye-outline" size={18} color={Colors.warning} />
            <Text className="flex-1 text-[13px] leading-5 text-warning">
              {t('Check these numbers before submitting')}
              {isEdit ? '.' : t(' — a visit can only be edited until midnight tonight.')}
            </Text>
          </View>

          <Card className="px-4">
            <View className="flex-row items-baseline justify-between pt-4">
              <Text weight="extrabold" className="text-[16px]">
                {t('Packets sold & stock')}
              </Text>
              <Text weight="bold" className="text-[13px] text-brand">
                {t('{n} sold', { n: totalSold })}
              </Text>
            </View>
            {products.map((p) => (
              <ReviewRow
                key={p.value}
                label={p.label}
                value={`${t('Sold')} ${sold[p.value] ?? 0} · ${t('Stock')} ${stock[p.value] ?? 0}`}
              />
            ))}
            <ReviewRow label={t('Our rank')} value={rank === null ? t('N/A') : String(rank)} />
            <ReviewRow
              label={t('Competitor presence')}
              value={
                competitor === 'none'
                  ? t(competitorLabel)
                  : `${t(competitorLabel)}${competitorBrand.trim() ? ` — ${competitorBrand.trim()}` : ''}`
              }
            />
            <ReviewRow label={t('Remarks')} value={remarks.trim() || '—'} last />
          </Card>

          <View className="flex-row gap-3">
            <Button title={t('Back')} variant="secondary" onPress={() => goTo('form')} disabled={busy} className="flex-1" />
            <Button
              title={isEdit ? t('Save changes') : t('Submit visit')}
              icon="checkmark"
              onPress={submit}
              loading={busy}
              className="flex-1"
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function StepDots({ step }: { step: 'form' | 'review' }) {
  const t = useT();
  return (
    <View className="flex-row gap-2">
      {(['form', 'review'] as const).map((s, i) => {
        const on = s === 'form' || step === 'review';
        return (
          <View key={s} className="flex-1 gap-1.5">
            <View className={`h-1 rounded-full ${on ? 'bg-brand' : 'bg-line'}`} />
            <Text weight="bold" className={`text-[11.5px] ${on ? 'text-brand' : 'text-ink-3'}`}>
              {i + 1}. {s === 'form' ? t('Fill in') : t('Review & submit')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const t = useT();
  return (
    <View className="flex-row items-center gap-1.5">
      <StepButton icon="remove" onPress={() => onChange(Math.max(0, value - 1))} disabled={value === 0} label={`${t('Decrease')} ${label}`} />
      <Text
        weight="extrabold"
        accessibilityLabel={`${label}: ${value}`}
        className="min-w-[30px] text-center text-[17px]"
        style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <StepButton icon="add" onPress={() => onChange(value + 1)} label={`${t('Increase')} ${label}`} />
    </View>
  );
}

function StepButton({
  icon,
  onPress,
  disabled,
  label,
}: {
  icon: 'add' | 'remove';
  onPress: () => void;
  disabled?: boolean;
  label: string;
}) {
  const Colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      className={`h-11 w-11 items-center justify-center rounded-xl active:opacity-70 ${
        icon === 'add' ? 'bg-brand' : 'bg-accent-tint'
      } ${disabled ? 'opacity-40' : ''}`}>
      <Ionicons name={icon} size={20} color={icon === 'add' ? '#fff' : Colors.brand} />
    </Pressable>
  );
}

function ReviewRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`flex-row items-start justify-between gap-3 py-3 ${last ? 'pb-4' : 'border-b border-line-soft'}`}>
      <Text className="text-[13.5px] text-ink-3">{label}</Text>
      <Text weight="bold" className="flex-1 text-right text-[14px]">
        {value}
      </Text>
    </View>
  );
}
