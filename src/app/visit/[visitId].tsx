import { router, useLocalSearchParams } from 'expo-router';

import { VisitForm } from '@/components/visit-form';
import { ErrorScreen, LoadingScreen } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/use-api-query';
import { useSession } from '@/lib/auth/session';
import type { EditableVisit, VisitInput } from '@/lib/visits';

/** Edit one of today's visits — own visits only, until midnight (enforced by
 * the server's `getVisitForEdit` / `updateVisit`). */
export default function EditVisitScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { authedApi } = useSession();
  const { data, error, loading, refresh } = useApiQuery<EditableVisit>(
    `/api/mobile/visits/${encodeURIComponent(visitId)}`,
  );

  if (loading && !data) return <LoadingScreen />;
  if (!data) return <ErrorScreen message={error ?? 'Could not load this visit.'} onRetry={refresh} />;

  async function submit(input: VisitInput) {
    await authedApi(`/api/mobile/visits/${encodeURIComponent(visitId)}`, { method: 'PATCH', body: input });
    router.back();
  }

  return (
    <VisitForm
      mode="edit"
      counterName={data.counter.name}
      counterSubtitle={data.counter.subtitle}
      options={data.options}
      initial={data.visit}
      onSubmit={submit}
      onCancel={() => router.back()}
    />
  );
}
