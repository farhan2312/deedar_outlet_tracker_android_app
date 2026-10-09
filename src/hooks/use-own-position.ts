import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useTracking } from '@/hooks/use-tracking';
import { STALE_AFTER_MS } from '@/lib/tracking/protocol';

export type OwnPosition = { lat: number; lng: number; accuracyM: number | null; at: number };
export type OwnPositionState = 'locating' | 'ok' | 'denied' | 'unavailable';

/**
 * Where the ISR is, for the map — the website's `useOwnPosition`. Watches the
 * GPS while the screen is open (asking once if needed), and starts from the
 * tracker's latest fix so the dot appears straight away.
 */
export function useOwnPosition() {
  const tracking = useTracking();
  const [watched, setWatched] = useState<OwnPosition | null>(null);
  const [state, setState] = useState<OwnPositionState>('locating');

  useFocusEffect(
    useCallback(() => {
      let sub: Location.LocationSubscription | null = null;
      let cancelled = false;
      (async () => {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) {
          setState('denied');
          return;
        }
        try {
          sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 10_000 },
            (loc) => {
              setWatched({
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                accuracyM: loc.coords.accuracy != null ? Math.round(loc.coords.accuracy) : null,
                at: loc.timestamp,
              });
              setState('ok');
            },
          );
          if (cancelled) sub.remove();
        } catch {
          if (!cancelled) setState('unavailable');
        }
      })();
      return () => {
        cancelled = true;
        sub?.remove();
      };
    }, []),
  );

  const fromTracker = tracking.lastFix
    ? {
        lat: tracking.lastFix.lat,
        lng: tracking.lastFix.lng,
        accuracyM: tracking.lastFix.accuracyM ?? null,
        at: tracking.lastFix.recordedAt,
      }
    : null;
  // Whichever fix is newer.
  const position = watched && (!fromTracker || watched.at >= fromTracker.at) ? watched : fromTracker;

  return {
    position,
    state: position && state === 'locating' ? 'ok' : state,
    isStale: (now: number) => !!position && now - position.at > STALE_AFTER_MS,
  };
}
