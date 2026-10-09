import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { handleFix, isExpoGo, LOCATION_TASK } from './tracker';

/**
 * The background location task. Must be defined at the top level of the
 * bundle, before any screen — Android can start the app just to deliver
 * locations, with nothing mounted — so `index.js` imports this first.
 *
 * Expo Go has no TaskManager on Android; the tracker falls back to a
 * foreground watch there, so the task is simply not defined.
 */
if (!isExpoGo) {
  TaskManager.defineTask<{ locations: LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    // Updates can arrive batched; only the newest position matters.
    const newest = data.locations.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
    handleFix(newest);
  });
}
