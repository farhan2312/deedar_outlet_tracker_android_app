import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { FlatList, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeafletMap, MAP_COLORS, type MapCounter } from '@/components/leaflet-map';
import { TrackingCard } from '@/components/tracking-card';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ErrorBanner } from '@/components/ui/error-banner';
import { EmptyState, ErrorScreen, LoadingScreen } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { useColors } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { useOwnPosition } from '@/hooks/use-own-position';
import { useT } from '@/lib/i18n/language';
import { distanceLabel, distanceMeters } from '@/lib/tracking/protocol';

type MapData = {
  label: string;
  levels: { key: 'cnf' | 'depot' | 'area'; label: string; allLabel: string; options: { id: string; name: string }[]; value: string }[];
  missingGps: number;
  counters: (MapCounter & { lastVisitLabel: string | null })[];
  tiles: { url: string; attribution: string };
};

function openCounter(id: string, name?: string) {
  router.push({ pathname: '/counter/[id]', params: { id, ...(name ? { name } : {}) } });
}

/** The website's ISR Live map: you, your areas' counters and today's beat. */
export default function MapScreen() {
  const Colors = useColors();
  const t = useT();
  const [areaId, setAreaId] = useState<string | null>(null);
  const { data, error, loading, refresh } = useApiQuery<MapData>(
    areaId ? `/api/mobile/map?area=${encodeURIComponent(areaId)}` : '/api/mobile/map',
  );
  const { position, state, isStale } = useOwnPosition();
  const [focus, setFocus] = useState<{ id: string; at: number } | null>(null);
  const [locateAt, setLocateAt] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading && !data) return <LoadingScreen />;
  if (!data) return <ErrorScreen message={error ?? 'Could not load the map.'} onRetry={refresh} />;

  const me = position
    ? { lat: position.lat, lng: position.lng, accuracyM: position.accuracyM, stale: isStale(now) }
    : null;

  // The list is the day's to-do: today's beat only, nearest first once
  // located, otherwise unvisited before visited (as on the website).
  const beat = data.counters
    .filter((c) => c.assigned || c.visited)
    .map((c) => ({ counter: c, metres: position ? distanceMeters(position.lat, position.lng, c.lat, c.lng) : null }))
    .sort((a, b) => {
      if (a.metres != null && b.metres != null) return a.metres - b.metres;
      if (a.counter.visited !== b.counter.visited) return Number(a.counter.visited) - Number(b.counter.visited);
      return a.counter.name.localeCompare(b.counter.name);
    });

  const areaLevel = data.levels.find((l) => l.key === 'area');
  const note =
    state === 'denied'
      ? t('Location blocked — allow access to see how far each counter is.')
      : state === 'unavailable'
        ? t('Location unavailable on this device.')
        : state === 'locating'
          ? t('Finding your location…')
          : null;

  return (
    <View className="flex-1 bg-canvas">
      <View className="mx-4 h-[46%] overflow-hidden rounded-3xl border border-line-soft">
        <LeafletMap
          tiles={data.tiles}
          counters={data.counters}
          me={me}
          focus={focus}
          locateAt={fullscreen ? null : locateAt}
          onCheckIn={(id) => openCounter(id, data.counters.find((c) => c.id === id)?.name)}
        />
        <View className="absolute right-3 top-3 gap-2">
          <MapButton icon="expand" label={t('Full screen map')} onPress={() => setFullscreen(true)} />
          <MapButton icon="locate" label={t('Centre on me')} onPress={() => setLocateAt(Date.now())} disabled={!me} />
        </View>
        <MapLegend />
      </View>

      {/* Full screen: the map alone, over the tabs. Back closes it. */}
      <Modal
        visible={fullscreen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFullscreen(false)}>
        <View className="flex-1 bg-canvas">
          <LeafletMap
            tiles={data.tiles}
            counters={data.counters}
            me={me}
            focus={null}
            locateAt={fullscreen ? locateAt : null}
            onCheckIn={(id) => {
              setFullscreen(false);
              openCounter(id, data.counters.find((c) => c.id === id)?.name);
            }}
          />
          <View className="absolute right-4 gap-2" style={{ top: insets.top + 12 }}>
            <MapButton icon="contract" label={t('Exit full screen')} onPress={() => setFullscreen(false)} />
            <MapButton icon="locate" label={t('Centre on me')} onPress={() => setLocateAt(Date.now())} disabled={!me} />
          </View>
          <View className="absolute left-4 right-4 gap-2" style={{ bottom: insets.bottom + 16 }}>
            <View className="flex-row gap-2 self-start">
              <Badge label={t('{n} pending', { n: beat.filter((b) => !b.counter.visited).length })} tone="neutral" />
              <Badge label={t('{n} visited', { n: beat.filter((b) => b.counter.visited).length })} tone="success" />
            </View>
            <MapLegend inline />
          </View>
        </View>
      </Modal>

      <FlatList
        className="flex-1"
        contentContainerClassName="gap-2.5 px-4 pb-8 pt-4"
        data={beat}
        keyExtractor={(r) => r.counter.id}
        ListHeaderComponent={
          <View className="mb-1 gap-3">
            <TrackingCard hideWhenOff />
            {error ? <ErrorBanner message={error} /> : null}
            {note ? (
              <Text className={`text-[12.5px] ${state === 'denied' ? 'text-danger' : 'text-ink-3'}`}>{note}</Text>
            ) : null}

            {areaLevel && areaLevel.options.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                <Chip label={t(areaLevel.allLabel)} active={!areaId} onPress={() => setAreaId(null)} />
                {areaLevel.options.map((a) => (
                  <Chip key={a.id} label={a.name} active={areaId === a.id} onPress={() => setAreaId(a.id)} />
                ))}
              </ScrollView>
            )}

            <View className="flex-row items-center gap-2">
              <Text weight="extrabold" className="text-[17px]">
                {t("Today's Beat")}
              </Text>
              <Badge label={String(beat.length)} tone="neutral" />
              <Text className="ml-auto text-[12px] text-ink-3">{position ? t('Nearest first') : ''}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="flag-outline"
            title={t('No beat today')}
            body={t("Your Sales Officer hasn't assigned any counters yet.")}
          />
        }
        ListFooterComponent={
          <Text className="mt-2 text-[12px] leading-[18px] text-ink-3">
            {t('Distances are straight-line from your current location, not road distance.')}
            {data.missingGps > 0 ? (
              <Text className="text-[12px] text-warning">
                {' '}
                {data.missingGps} {t(data.missingGps === 1 ? 'counter without GPS not shown.' : 'counters without GPS not shown.')}
              </Text>
            ) : null}
          </Text>
        }
        renderItem={({ item: { counter: c, metres } }) => {
          const color = c.visited ? MAP_COLORS.visited : MAP_COLORS.pending;
          const looking = focus?.id === c.id;
          return (
            <Card className={`flex-row items-center gap-3 py-2 pl-3.5 pr-2 ${looking ? 'border-brand bg-accent-tint' : ''}`}>
              <Pressable
                className="flex-1 gap-1 py-1"
                onPress={() => setFocus({ id: c.id, at: Date.now() })}
                accessibilityRole="button"
                accessibilityLabel={`${t('Show on map')}: ${c.name}`}>
                <View className="flex-row items-center gap-2">
                  <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <Text weight="bold" numberOfLines={1} className="flex-1 text-[14.5px]">
                    {c.name}
                  </Text>
                </View>
                <Text numberOfLines={1} className="text-[12px] text-ink-3">
                  {t(c.type)} · {c.area}
                </Text>
              </Pressable>
              <View className="items-end">
                <Text weight="extrabold" className="text-[13.5px] text-brand">
                  {metres != null ? distanceLabel(metres) : '—'}
                </Text>
                <Text className="text-[11px] text-ink-3">{c.visited ? t('Visited') : t('Pending')}</Text>
              </View>
              <Pressable
                onPress={() => openCounter(c.id, c.name)}
                accessibilityRole="button"
                accessibilityLabel={c.visited ? `${t('Open counter')}: ${c.name}` : t('Check in at {name}', { name: c.name })}
                className={`h-11 w-11 items-center justify-center rounded-2xl active:opacity-75 ${c.visited ? 'bg-canvas' : 'bg-brand'}`}>
                <Ionicons name={c.visited ? 'checkmark-done' : 'log-in-outline'} size={19} color={c.visited ? Colors.ink3 : '#fff'} />
              </Pressable>
            </Card>
          );
        }}
      />
    </View>
  );
}

/** Round white button floating over the map. */
function MapButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const Colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className={`h-11 w-11 items-center justify-center rounded-2xl bg-surface shadow-md shadow-black/20 active:opacity-80 ${
        disabled ? 'opacity-50' : ''
      }`}>
      <Ionicons name={icon} size={20} color={Colors.brand} />
    </Pressable>
  );
}

function MapLegend({ inline }: { inline?: boolean }) {
  const t = useT();
  return (
    <View
      className={`flex-row flex-wrap gap-x-3 gap-y-1 rounded-2xl bg-surface/95 px-3 py-2 ${
        inline ? 'self-start shadow-md shadow-black/15' : 'absolute bottom-3 left-3'
      }`}>
      <Legend color={MAP_COLORS.visited} label={t('Visited')} />
      <Legend color={MAP_COLORS.pending} label={t('Pending')} />
      <Legend color={MAP_COLORS.counter} label={t('Counter')} />
      <Legend color={MAP_COLORS.me} label={t('You')} />
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <Text weight="semibold" className="text-[11px] text-ink-2">
        {label}
      </Text>
    </View>
  );
}
