import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/auth/session';

/**
 * Loads a `/api/mobile/*` GET for a screen, and reloads it whenever the screen
 * comes back into focus so what the ISR sees is never stale after they move
 * between screens.
 *
 * - `loading`: first load, nothing to show yet.
 * - `refreshing`: pull-to-refresh in progress.
 * - `error`: the last load failed; `data` keeps the previous good result.
 * - `setData`: for writes whose response is the fresh data.
 */
export function useApiQuery<T>(path: string) {
  const { authedApi } = useSession();
  // Read through a ref so a new `authedApi` identity never re-triggers a load.
  const apiRef = useRef(authedApi);
  useEffect(() => {
    apiRef.current = authedApi;
  });

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (pullToRefresh: boolean) => {
      if (pullToRefresh) setRefreshing(true);
      try {
        const next = await apiRef.current<T>(path);
        setData(next);
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [path],
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  return {
    data,
    setData,
    error,
    setError,
    loading,
    refreshing,
    refresh: () => load(true),
  };
}
