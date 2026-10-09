import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { getTrackingSnapshot, subscribe, syncTracking } from '@/lib/tracking/tracker';

/** Live location sharing status, for screens. */
export function useTracking() {
  return useSyncExternalStore(subscribe, getTrackingSnapshot, getTrackingSnapshot);
}

/**
 * Keeps sharing in step with the server while signed in: checks on launch and
 * every time the app comes back to the foreground (the day may have been
 * ended on the website, or a new day begun).
 */
export function useTrackingLifecycle() {
  useEffect(() => {
    void syncTracking();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void syncTracking();
    });
    return () => sub.remove();
  }, []);
}
