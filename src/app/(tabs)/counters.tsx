import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Fab } from '@/components/ui/fab';
import { EmptyState, MessageScreen } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Fonts, useColors } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/auth/session';
import type { CounterRow, CountersPage } from '@/lib/counters';
import { useT } from '@/lib/i18n/language';

type Loaded = Extract<CountersPage, { assigned: true }>;

const SEARCH_DELAY_MS = 400;

const STATUS_TONE: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  active: { label: 'Active', tone: 'success' },
  dormant: { label: 'Dormant', tone: 'warning' },
  declining: { label: 'Declining', tone: 'danger' },
};

export default function CountersScreen() {
  const Colors = useColors();
  const t = useT();
  const { authedApi } = useSession();
  const apiRef = useRef(authedApi);
  useEffect(() => {
    apiRef.current = authedApi;
  });

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);

  const [rows, setRows] = useState<CounterRow[]>([]);
  const [meta, setMeta] = useState<Omit<Loaded, 'rows'> | null>(null);
  const [notAssigned, setNotAssigned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The filters the list on screen was loaded for. While they differ from the
  // current filters, a new list is on its way.
  const filterKey = `${debouncedQuery}|${areaId ?? ''}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== filterKey;
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Only the newest request may write to state — typing fast fires several,
  // and an older one can land last.
  const requestId = useRef(0);
  const loadedPages = useRef(0);
  const firstFocus = useRef(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [query]);

  const fetchPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (areaId) params.set('area', areaId);
      return apiRef.current<CountersPage>(`/api/mobile/counters?${params.toString()}`);
    },
    [debouncedQuery, areaId],
  );

  /** Reload pages 1..`pages` and replace the list. State is only written in
   * the request's callbacks, and only by the newest request. */
  const reload = useCallback(
    (pages: number) => {
      const id = ++requestId.current;
      const key = filterKey;
      const settle = () => {
        setLoadedKey(key);
        setRefreshing(false);
      };
      Promise.all(Array.from({ length: Math.max(1, pages) }, (_, i) => fetchPage(i + 1))).then(
        (results) => {
          if (id !== requestId.current) return;
          const first = results[0];
          if (!first.assigned) {
            setNotAssigned(first.message);
            setRows([]);
            setMeta(null);
          } else {
            setNotAssigned(null);
            const loaded = results.filter((r): r is Loaded => r.assigned);
            // Pages are clamped server-side, so drop any repeated last page.
            const seen = new Set<string>();
            setRows(loaded.flatMap((r) => r.rows).filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))));
            const { rows: _rows, ...rest } = loaded[loaded.length - 1];
            setMeta(rest);
            loadedPages.current = rest.page;
          }
          setError(null);
          settle();
        },
        (err: unknown) => {
          if (id !== requestId.current) return;
          setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
          settle();
        },
      );
    },
    [fetchPage, filterKey],
  );

  // New search or area → back to page 1.
  useEffect(() => {
    reload(1);
  }, [reload]);

  function refresh() {
    setRefreshing(true);
    reload(1);
  }

  // Coming back from a counter (a visit may have just been logged) refreshes
  // the pages already shown, so "Visited today" is current without losing
  // the scroll position. Through a ref: a filter change makes a new `reload`,
  // and that must not re-run this focus effect.
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  });
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reloadRef.current(loadedPages.current);
    }, []),
  );

  async function loadMore() {
    if (!meta || loadingMore || loading || meta.page >= meta.totalPages) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const next = await fetchPage(meta.page + 1);
      if (id !== requestId.current || !next.assigned) return;
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...next.rows.filter((r) => !seen.has(r.id))];
      });
      const { rows: _rows, ...rest } = next;
      setMeta(rest);
      loadedPages.current = next.page;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  }

  if (notAssigned) return <MessageScreen icon="business-outline" title={t('No stockist yet')} body={t(notAssigned)} />;

  const filtered = !!(debouncedQuery || areaId);

  return (
    <View className="flex-1 bg-canvas">
      <FlatList
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-1"
        data={loading ? [] : rows}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[Colors.brand]} />}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View className="mb-4 gap-3">
            <View className="h-[52px] flex-row items-center gap-2.5 rounded-2xl border border-line bg-surface px-4">
              <Ionicons name="search" size={19} color={Colors.ink3} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('Search by name or mobile…')}
                placeholderTextColor={Colors.ink3}
                autoCorrect={false}
                returnKeyType="search"
                className="flex-1 text-[15px] text-ink-1"
                style={{ fontFamily: Fonts.medium }}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel={t('Clear search')}>
                  <Ionicons name="close-circle" size={19} color={Colors.ink3} />
                </Pressable>
              ) : null}
            </View>

            {meta && meta.areaOptions.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                <Chip label={t('All areas')} active={!areaId} onPress={() => setAreaId(null)} />
                {meta.areaOptions.map((a) => (
                  <Chip key={a.id} label={a.name} active={areaId === a.id} onPress={() => setAreaId(a.id)} />
                ))}
              </ScrollView>
            )}

            {meta && !loading && (
              <View className="flex-row items-center justify-between">
                <Text weight="semibold" className="text-[12.5px] text-ink-3">
                  {meta.total} {t(meta.total === 1 ? 'counter' : 'counters')}
                </Text>
                <Badge label={meta.scope} tone="brand" />
              </View>
            )}

            {error ? <ErrorBanner message={error} /> : null}
            {error && rows.length === 0 && !loading ? (
              <Button title={t('Try again')} icon="refresh" variant="secondary" onPress={refresh} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.brand} size="large" className="mt-12" />
          ) : error ? null : (
            <EmptyState
              icon={filtered ? 'search-outline' : 'storefront-outline'}
              title={filtered ? t('No counters match') : t('No counters yet')}
              body={filtered ? t('Try a different name, number or area.') : t('No counters mapped to your stockist yet.')}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.brand} className="my-4" /> : null}
        renderItem={({ item }) => <CounterItem counter={item} />}
      />
      <Fab icon="add" label={t('New counter')} onPress={() => router.push('/new-counter')} />
    </View>
  );
}

function Separator() {
  return <View className="h-2.5" />;
}

function CounterItem({ counter: c }: { counter: CounterRow }) {
  const Colors = useColors();
  const t = useT();
  const status = STATUS_TONE[c.status] ?? { label: c.status, tone: 'neutral' as const };
  return (
    <Card
      className="flex-row items-center gap-3 p-3.5"
      onPress={() => router.push({ pathname: '/counter/[id]', params: { id: c.id, name: c.name } })}
      accessibilityLabel={c.name}>
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-tint">
        <Text weight="extrabold" className="text-[16px] text-brand">
          {c.name.trim()[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View className="flex-1 gap-1">
        <Text weight="bold" numberOfLines={1} className="text-[15px]">
          {c.name}
        </Text>
        <Text numberOfLines={1} className="text-[12.5px] text-ink-3">
          {t(c.type)} · {c.areaName}
          {c.phone ? ` · ${c.phone}` : ''}
        </Text>
        <View className="flex-row gap-1.5">
          <Badge label={t(status.label)} tone={status.tone} />
          {c.visitedToday && <Badge label={t('Visited today')} tone="success" dot />}
        </View>
      </View>
      {c.canVisit && !c.visitedToday ? (
        <View className="rounded-xl bg-brand px-3.5 py-2">
          <Text weight="bold" className="text-[12.5px] text-white">
            {t('Check in')}
          </Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={Colors.ink3} />
      )}
    </Card>
  );
}
