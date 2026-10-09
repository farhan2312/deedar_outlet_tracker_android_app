import { router, useLocalSearchParams } from 'expo-router';

import { VisitForm } from '@/components/visit-form';
import { Button } from '@/components/ui/button';
import { ErrorScreen, LoadingScreen, MessageScreen } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/use-api-query';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/auth/session';
import { useT } from '@/lib/i18n/language';
import { START_DAY_MESSAGE, type CounterPage, type VisitInput } from '@/lib/visits';

/** Add a visit. The counter page's `action` decides whether the form opens —
 * the same guards as the website's new-visit page (and `createVisit` checks
 * them all again on save). */
export default function NewVisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { authedApi } = useSession();
  const { data, error, loading, refresh } = useApiQuery<CounterPage>(`/api/mobile/counters/${encodeURIComponent(id)}`);

  if (loading && !data) return <LoadingScreen />;
  if (!data) return <ErrorScreen message={error ?? 'Could not load this counter.'} onRetry={refresh} />;

  const { counter, action, options } = data;

  if (action.kind === 'start_day_first') {
    return (
      <MessageScreen
        icon="sunny-outline"
        title={t('Start your day first')}
        body={t(START_DAY_MESSAGE)}
        action={<Button title={t('Go to Day Log')} icon="calendar" onPress={() => router.replace('/day-log')} />}
      />
    );
  }
  if (action.kind === 'edit_today') {
    return (
      <MessageScreen
        icon="checkmark-circle-outline"
        title={t('Already visited today')}
        body={t("You've already visited this counter today. Edit that visit instead of adding a new one.")}
        action={
          <Button
            title={t("Edit today's visit")}
            icon="pencil"
            onPress={() => router.replace({ pathname: '/visit/[visitId]', params: { visitId: action.visitId } })}
          />
        }
      />
    );
  }
  if (action.kind === 'visited_by_other') {
    return (
      <MessageScreen
        icon="people-outline"
        title={t('Already visited today')}
        body={t('{name} already visited this counter today. A counter is visited once a day.', { name: action.byName })}
      />
    );
  }
  if (action.kind === 'not_your_stockist') {
    return (
      <MessageScreen
        icon="lock-closed-outline"
        title={t('Not your stockist')}
        body={t("This counter isn't at your stockist, so you can't add a visit to it.")}
      />
    );
  }

  async function submit(input: VisitInput) {
    try {
      await authedApi(`/api/mobile/counters/${encodeURIComponent(counter.id)}/visits`, {
        method: 'POST',
        body: input,
      });
      router.back();
    } catch (err) {
      // Already logged today by this ISR (another phone, a stale screen):
      // nothing to fix here — open that visit instead.
      const existing = err instanceof ApiError ? err.data?.existingVisitId : undefined;
      if (typeof existing === 'string') {
        router.replace({ pathname: '/visit/[visitId]', params: { visitId: existing } });
        return;
      }
      // A colleague got there first: say who, in the ISR's language.
      const byName = err instanceof ApiError ? err.data?.blockedByName : undefined;
      if (typeof byName === 'string') {
        throw new ApiError(
          409,
          t('{name} already visited this counter today. A counter is visited once a day.', { name: byName }),
        );
      }
      throw err;
    }
  }

  return (
    <VisitForm
      mode="create"
      counterName={counter.name}
      counterSubtitle={`${counter.typeLabel} · ${counter.areaName}`}
      options={options}
      onSubmit={submit}
      onCancel={() => router.back()}
    />
  );
}
