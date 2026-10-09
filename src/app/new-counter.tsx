import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { GpsCapture } from '@/components/gps-capture';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ErrorScreen, LoadingScreen, MessageScreen } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useColors } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/auth/session';
import { useT } from '@/lib/i18n/language';
import type { DuplicateMatch, NewCounterForm } from '@/lib/new-counter';

type Step = 'duplicate' | 'details' | 'review';
type Ready = Extract<NewCounterForm, { ok: true }>;

const STEPS: { key: Step; label: string }[] = [
  { key: 'duplicate', label: 'Mobile' },
  { key: 'details', label: 'Details' },
  { key: 'review', label: 'Review' },
];

const isPhone = (s: string) => /^\d{10}$/.test(s);

/** Mirrors `parseCoords` on the server: two in-range numbers, not 0,0. */
function hasCoords(gps: string): boolean {
  const parts = gps.split(',').map((s) => Number(s.trim()));
  return (
    parts.length === 2 &&
    parts.every(Number.isFinite) &&
    Math.abs(parts[0]) <= 90 &&
    Math.abs(parts[1]) <= 180 &&
    !(parts[0] === 0 && parts[1] === 0)
  );
}

export default function NewCounterScreen() {
  const t = useT();
  const { data, error, loading, refresh } = useApiQuery<NewCounterForm>('/api/mobile/counters/new');

  if (loading && !data) return <LoadingScreen />;
  if (!data) return <ErrorScreen message={error ?? 'Could not load the form.'} onRetry={refresh} />;
  if (!data.ok) {
    return (
      <MessageScreen
        icon={data.startDayFirst ? 'sunny-outline' : 'business-outline'}
        title={data.startDayFirst ? t('Start your day first') : t("Can't add counters yet")}
        body={t(data.message)}
        action={
          data.startDayFirst ? (
            <Button title={t('Go to Day Log')} icon="calendar" onPress={() => router.replace('/day-log')} />
          ) : undefined
        }
      />
    );
  }
  return <Wizard form={data} />;
}

/** The website's NewCounterWizard, ISR ("locked") mode: stockist and C&F are
 * the ISR's own; the mobile number is checked for duplicates first. */
function Wizard({ form }: { form: Ready }) {
  const Colors = useColors();
  const t = useT();
  const { authedApi } = useSession();
  const [step, setStep] = useState<Step>('duplicate');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [areaId, setAreaId] = useState('');
  const [type, setType] = useState('');
  const [typeOther, setTypeOther] = useState('');
  const [gps, setGps] = useState('');

  const [dup, setDup] = useState<DuplicateMatch>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  // Read through a ref so a new `authedApi` identity never repeats the lookup.
  const apiRef = useRef(authedApi);
  useEffect(() => {
    apiRef.current = authedApi;
  });

  // Look the number up as soon as it's 10 digits. State is only written in
  // the async callback; `checking` is set by the input handler.
  useEffect(() => {
    if (step !== 'duplicate' || !isPhone(phone)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      apiRef.current<{ match: DuplicateMatch }>(`/api/mobile/counters/check-duplicate?phone=${phone}`).then(
        ({ match }) => {
          if (cancelled) return;
          setDup(match);
          setChecking(false);
        },
        (err: unknown) => {
          if (cancelled) return;
          setCheckError(err instanceof ApiError ? err.message : "Couldn't check this number. Try again.");
          setChecking(false);
        },
      );
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone, step]);

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const areaName = form.areas.find((a) => a.id === areaId)?.name ?? '';
  const typeLabel = type === 'Others' ? typeOther.trim() : t(type);

  function goTo(next: Step) {
    setError('');
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function goReview() {
    if (!name.trim() || !areaId || !type) {
      setError('Fill name, area and type.');
      return;
    }
    if (type === 'Others' && !typeOther.trim()) {
      setError('Enter the counter type.');
      return;
    }
    if (!hasCoords(gps)) {
      setError("Capture the counter's GPS location before saving.");
      return;
    }
    goTo('review');
  }

  async function submit() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const { counterId } = await authedApi<{ counterId: string }>('/api/mobile/counters', {
        method: 'POST',
        body: {
          name,
          phone,
          address,
          stockistId: form.depot.id,
          areaId,
          type,
          typeOther: type === 'Others' ? typeOther.trim() : undefined,
          gps,
        },
      });
      // Land on the new counter — the ISR is standing in front of it, and
      // Add Visit is right there (as on the website). Stay busy: navigating.
      router.replace({ pathname: '/counter/[id]', params: { id: counterId, name: name.trim() } });
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <ScrollView ref={scrollRef} className="flex-1 bg-canvas" contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
      {/* Step bar */}
      <View className="flex-row items-center">
        {STEPS.map((s, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <View key={s.key} className="flex-1 flex-row items-center">
              <View className="items-center gap-1">
                <View
                  className={`h-8 w-8 items-center justify-center rounded-full ${
                    done || current ? 'bg-brand' : 'border-2 border-line bg-surface'
                  }`}>
                  {done ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : (
                    <Text weight="bold" className={`text-[13px] ${current ? 'text-white' : 'text-ink-3'}`}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text weight="bold" className={`text-[11px] ${done || current ? 'text-brand' : 'text-ink-3'}`}>
                  {t(s.label)}
                </Text>
              </View>
              {i < STEPS.length - 1 && <View className={`mx-1 mb-4 h-0.5 flex-1 ${done ? 'bg-brand' : 'bg-line'}`} />}
            </View>
          );
        })}
      </View>

      {step === 'duplicate' && (
        <>
          <Card className="gap-4 p-5">
            <View className="gap-1">
              <Text weight="extrabold" className="text-[20px]">
                {t('Check for duplicates')}
              </Text>
              <Text className="text-[13.5px] leading-5 text-ink-2">
                {t("Search by mobile number first — it's the unique ID for a counter, unlike free-text shop names.")}
              </Text>
            </View>

            <TextField
              label={t('Owner / Counter Mobile Number *')}
              icon="call-outline"
              value={phone}
              onChangeText={(text) => {
                const next = text.replace(/\D/g, '').slice(0, 10);
                setPhone(next);
                setDup(null);
                setError('');
                setCheckError('');
                setChecking(isPhone(next));
              }}
              placeholder={t('10-digit mobile')}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {checking && <Text className="text-[12.5px] text-ink-3">{t('Checking…')}</Text>}
            {!checking && !dup && !checkError && isPhone(phone) && (
              <View className="flex-row items-center gap-2 rounded-xl bg-success-tint px-3 py-2.5">
                <Ionicons name="checkmark-circle" size={17} color={Colors.success} />
                <Text weight="semibold" className="flex-1 text-[13px] text-success">
                  {t('New number — no existing counter with this mobile.')}
                </Text>
              </View>
            )}
            {checkError ? <ErrorBanner message={checkError} /> : null}

            {dup && (
              <View className="gap-3 rounded-2xl bg-warning-tint p-4">
                <Text weight="bold" className="text-[13px] text-warning">
                  {t('This mobile number is already a counter')}
                </Text>
                <Text weight="semibold" className="text-[14px]">
                  {dup.name} · {t(dup.type)} · {dup.area} · {dup.stockistName}
                </Text>
                {dup.canVisit ? (
                  <Button
                    title={t('Add a visit to this counter →')}
                    icon="arrow-forward"
                    onPress={() => router.replace({ pathname: '/counter/[id]', params: { id: dup.id, name: dup.name } })}
                  />
                ) : (
                  <Text className="text-[12.5px] text-ink-2">
                    {t("It's at another stockist, so you can't add a visit to it from here.")}
                  </Text>
                )}
              </View>
            )}
          </Card>

          <Button
            title={t('Continue')}
            icon="arrow-forward"
            onPress={() => goTo('details')}
            disabled={checking || !!dup || !!checkError || !isPhone(phone)}
          />
        </>
      )}

      {step === 'details' && (
        <>
          <Card className="gap-4 p-5">
            <Text weight="extrabold" className="text-[20px]">
              {t('Counter Identity')}
            </Text>
            <TextField
              label={t('Name of Counter/Point of Contact *')}
              icon="storefront-outline"
              value={name}
              onChangeText={setName}
              placeholder={t('e.g. Shree Ganesh Kirana')}
            />
            <TextField
              label={t('Address')}
              icon="map-outline"
              value={address}
              onChangeText={setAddress}
              placeholder={t('Street, landmark, village')}
            />
            <View className="flex-row gap-3">
              <Locked label={t('C&F')} value={form.cnfName} />
              <Locked label={t('Stockist')} value={form.depot.name} />
            </View>
          </Card>

          <Card className="gap-4 p-5">
            <Field label={t('Area *')}>
              {form.areas.length === 0 ? (
                <Text className="text-[12.5px] text-ink-3">
                  {t('Your stockist has no areas yet — ask your Sales Officer to add one.')}
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {form.areas.map((a) => (
                    <Chip key={a.id} role="radio" label={a.name} active={areaId === a.id} onPress={() => setAreaId(a.id)} />
                  ))}
                </View>
              )}
            </Field>

            <Field label={t('Type of Counter *')}>
              <View className="flex-row flex-wrap gap-2">
                {form.counterTypes.map((ct) => (
                  <Chip
                    key={ct}
                    role="radio"
                    label={t(ct)}
                    active={type === ct}
                    onPress={() => {
                      setType(ct);
                      if (ct !== 'Others') setTypeOther('');
                    }}
                  />
                ))}
              </View>
              {type === 'Others' && (
                <View className="mt-2">
                  <TextField
                    value={typeOther}
                    onChangeText={setTypeOther}
                    placeholder={t('Enter counter type, e.g. Medical Store')}
                    maxLength={60}
                    autoFocus
                  />
                </View>
              )}
            </Field>
          </Card>

          <View className="gap-3 rounded-3xl bg-accent-tint p-5">
            <View className="flex-row items-center gap-2">
              <Ionicons name="location" size={18} color={Colors.brand} />
              <Text weight="extrabold" className="text-[16px]">
                {t('GPS Coordinates *')}
              </Text>
            </View>
            <Text className="text-[12.5px] text-ink-2">{t('Capture this while standing at the counter.')}</Text>
            <GpsCapture value={gps} onCapture={setGps} />
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <View className="flex-row gap-3">
            <Button title={t('Back')} variant="secondary" onPress={() => goTo('duplicate')} className="flex-1" />
            <Button title={t('Review')} icon="arrow-forward" onPress={goReview} className="flex-1" />
          </View>
        </>
      )}

      {step === 'review' && (
        <>
          <Card className="px-5 py-2">
            <Text weight="extrabold" className="py-3 text-[20px]">
              {t('Review & submit')}
            </Text>
            <ReviewRow label={t('Mobile')} value={phone} />
            <ReviewRow label={t('Name')} value={name.trim()} />
            <ReviewRow label={t('Type')} value={typeLabel} />
            <ReviewRow label={t('Address')} value={address.trim() || '—'} />
            <ReviewRow label={t('C&F')} value={form.cnfName} />
            <ReviewRow label={t('Stockist')} value={form.depot.name} />
            <ReviewRow label={t('Area')} value={areaName} />
            <ReviewRow label={t('GPS')} value={gps || '—'} last />
          </Card>

          {error ? <ErrorBanner message={error} /> : null}

          <View className="flex-row gap-3">
            <Button title={t('Back')} variant="secondary" onPress={() => goTo('details')} disabled={busy} className="flex-1" />
            <Button title={t('Submit counter')} icon="checkmark" onPress={submit} loading={busy} className="flex-1" />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text weight="semibold" className="text-[13.5px]">
        {label}
      </Text>
      {children}
    </View>
  );
}

function Locked({ label, value }: { label: string; value: string }) {
  const Colors = useColors();
  return (
    <View className="flex-1 gap-1.5">
      <Text weight="semibold" className="text-[13.5px]">
        {label}
      </Text>
      <View className="min-h-[52px] flex-row items-center gap-2 rounded-2xl bg-canvas px-3.5">
        <Ionicons name="lock-closed" size={13} color={Colors.ink3} />
        <Text weight="semibold" numberOfLines={1} className="flex-1 text-[14px] text-ink-2">
          {value}
        </Text>
      </View>
    </View>
  );
}

function ReviewRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`flex-row items-start justify-between gap-3 py-3 ${last ? '' : 'border-b border-line-soft'}`}>
      <Text className="text-[13.5px] text-ink-3">{label}</Text>
      <Text weight="bold" className="flex-1 text-right text-[14px]">
        {value}
      </Text>
    </View>
  );
}
