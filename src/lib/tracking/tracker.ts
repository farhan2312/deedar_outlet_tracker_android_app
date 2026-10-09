import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import { io, type Socket } from 'socket.io-client';

import { Colors } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { loadSession } from '@/lib/auth/storage';
import { WS_URL } from '@/lib/config';
import { getDeviceId } from '@/lib/device-id';
import {
  distanceMeters,
  HEARTBEAT_MS,
  MIN_MOVE_METERS,
  type ClientToServerEvents,
  type LocationReport,
  type ServerToClientEvents,
} from './protocol';

/**
 * Live location sharing — the app's version of the website's
 * `useLocationReporter`, made to keep working with the screen off.
 *
 * The rules are the website's: a ticket from `issueRepTicket` (only while the
 * day is open, only on the phone that started it), then fixes over Socket.IO
 * to ws-server — sent when the ISR has moved 15 m, plus a heartbeat every
 * minute so a parked phone isn't mistaken for a dead one.
 *
 * Fixes come from a background location task (a foreground service with a
 * notification) when "Allow all the time" is granted. Without it — or in
 * Expo Go, which can't run background tasks — they come from a foreground
 * watch, so sharing still works while the app is open.
 *
 * Plain module state, not React: the background task runs it with no screen
 * mounted. Screens read it through `subscribe` / `getTrackingSnapshot`.
 */

export const LOCATION_TASK = 'deedar-location-tracking';

/** Expo Go can't run background tasks on Android. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** How often to take a fix. Every fix is checked against the move/heartbeat
 * rules, so this is also what makes the heartbeat possible while parked. */
const FIX_INTERVAL_MS = 30_000;

export type TrackingState =
  /** Not on the clock (day not started / ended), or signed out. */
  | 'off'
  /** Day is open but location permission is missing. */
  | 'needs_permission'
  | 'connecting'
  | 'live'
  /** Today's day was started on another device, which shares instead. */
  | 'blocked'
  | 'error';

export type TrackingSnapshot = {
  state: TrackingState;
  /** Server-provided reason for off / blocked / error. */
  message: string | null;
  /** Fixes keep coming with the screen off (background permission granted). */
  background: boolean;
  lastSentAt: number | null;
  /** The newest fix, for the map's "you are here". */
  lastFix: LocationReport | null;
};

type TrackingSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type TicketResult = { ok: true; ticket: string } | { ok: false; error: string; code?: 'other_device' };

// ── Observable snapshot ────────────────────────────────────────────────

let snapshot: TrackingSnapshot = { state: 'off', message: null, background: false, lastSentAt: null, lastFix: null };
const listeners = new Set<() => void>();

function update(patch: Partial<TrackingSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTrackingSnapshot(): TrackingSnapshot {
  return snapshot;
}

// ── Reporting ──────────────────────────────────────────────────────────

let socket: TrackingSocket | null = null;
let foregroundWatch: Location.LocationSubscription | null = null;
/** True while the day is open on this phone and sharing should run. */
let active = false;
let lastSent: { lat: number; lng: number; at: number } | null = null;

function push(fix: LocationReport) {
  if (!socket?.connected) return;
  socket.emit('location', fix, (res) => {
    if (!res.ok) return;
    lastSent = { lat: fix.lat, lng: fix.lng, at: res.at };
    update({ lastSentAt: res.at });
  });
}

/** Called for every fix, from the background task or the foreground watch. */
export function handleFix(location: Location.LocationObject) {
  const fix: LocationReport = {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracyM: location.coords.accuracy != null ? Math.round(location.coords.accuracy) : null,
    recordedAt: location.timestamp,
  };
  update({ lastFix: fix });

  // Started by the system with no screen open (fresh JS state): reconnect
  // first. The fix is sent as soon as the socket is up.
  if (!active) {
    void syncTracking();
    return;
  }
  const moved = !lastSent || distanceMeters(lastSent.lat, lastSent.lng, fix.lat, fix.lng) >= MIN_MOVE_METERS;
  const quiet = !lastSent || Date.now() - lastSent.at >= HEARTBEAT_MS;
  if (moved || quiet) push(fix);
}

async function requestTicket(): Promise<TicketResult | null> {
  const session = await loadSession();
  if (!session) return null;
  return api<TicketResult>('/api/mobile/tracking/ticket', {
    method: 'POST',
    token: session.token,
    body: { deviceId: await getDeviceId() },
  });
}

function openSocket(ticket: string) {
  const s: TrackingSocket = io(WS_URL, {
    // Native sockets straight away — long-polling only adds round trips on a
    // phone, and React Native has no CORS to fall back for.
    transports: ['websocket'],
    auth: { ticket },
    // Backoff with jitter so a tower outage doesn't stampede every rep back.
    reconnectionDelay: 2_000,
    reconnectionDelayMax: 30_000,
  });
  socket = s;

  s.on('connect', () => {
    if (socket !== s) return;
    update({ state: 'live', message: null });
    // Send where we are right away rather than waiting for the next fix.
    if (snapshot.lastFix) push(snapshot.lastFix);
  });

  s.on('disconnect', (reason) => {
    if (socket !== s || !active) return;
    // The server hanging up on purpose comes with a trackingError (handled
    // below); anything else is the network, and Socket.IO retries itself.
    if (reason !== 'io server disconnect') update({ state: 'connecting' });
  });

  // Tickets live 60 s, so a reconnect after a long outage needs a fresh one.
  s.on('connect_error', async () => {
    if (socket !== s || !active) return;
    update({ state: 'connecting' });
    try {
      const fresh = await requestTicket();
      if (socket !== s) return;
      if (!fresh) await stopSharing('off', null);
      else if (fresh.ok) s.auth = { ticket: fresh.ticket };
      else await refuse(fresh);
    } catch {
      // Offline — keep retrying with the old ticket; the next error tries again.
    }
  });

  // Day ended, account deactivated, or a new IST day began.
  s.on('trackingError', ({ message }) => {
    if (socket !== s) return;
    void stopSharing('off', message);
  });
}

// ── Starting and stopping ──────────────────────────────────────────────

/** Start receiving fixes, in the background if allowed. */
async function startUpdates(): Promise<'background' | 'foreground' | 'denied'> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) return 'denied';

  if (!isExpoGo && (await Location.getBackgroundPermissionsAsync()).granted) {
    try {
      if (!(await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: FIX_INTERVAL_MS,
          distanceInterval: 0,
          // Android needs a visible notification to keep location running
          // with the screen off; it also tells the ISR sharing is on.
          foregroundService: {
            notificationTitle: 'Sharing your location',
            notificationBody: 'Your Sales Officer can see you while your day is open.',
            notificationColor: Colors.brand,
            killServiceOnDestroy: false,
          },
        });
      }
      foregroundWatch?.remove();
      foregroundWatch = null;
      return 'background';
    } catch {
      // Fall through to the foreground watch.
    }
  }

  if (!foregroundWatch) {
    foregroundWatch = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: FIX_INTERVAL_MS, distanceInterval: 0 },
      handleFix,
    );
  }
  return 'foreground';
}

async function stopUpdates() {
  foregroundWatch?.remove();
  foregroundWatch = null;
  if (!isExpoGo) {
    try {
      if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      }
    } catch {
      // Not registered — nothing to stop.
    }
  }
}

async function stopSharing(state: TrackingState, message: string | null) {
  active = false;
  lastSent = null;
  const s = socket;
  socket = null;
  s?.disconnect();
  await stopUpdates();
  update({ state, message, background: false });
}

async function refuse(result: Extract<TicketResult, { ok: false }>) {
  await stopSharing(result.code === 'other_device' ? 'blocked' : 'off', result.error);
}

let syncing: Promise<void> | null = null;

/**
 * Bring sharing in line with the server: on if today's day is open on this
 * phone, off otherwise. Call on launch, when the app comes back to the
 * foreground, and after starting/ending the day. Never shows a prompt.
 */
export function syncTracking(): Promise<void> {
  syncing ??= doSync().finally(() => {
    syncing = null;
  });
  return syncing;
}

async function doSync() {
  let ticket: TicketResult | null;
  try {
    ticket = await requestTicket();
  } catch (err) {
    // Offline or server down: leave whatever is running alone — background
    // fixes keep coming and the socket reconnects on its own.
    if (err instanceof ApiError && err.isUnauthorized) await stopSharing('off', null);
    else if (!active) update({ state: 'error', message: err instanceof ApiError ? err.message : null });
    return;
  }

  if (!ticket) return stopSharing('off', null);
  if (!ticket.ok) return refuse(ticket);

  const mode = await startUpdates();
  if (mode === 'denied') {
    active = false;
    socket?.disconnect();
    socket = null;
    await stopUpdates();
    update({ state: 'needs_permission', message: null, background: false });
    return;
  }

  active = true;
  update({ background: mode === 'background' });
  if (!socket) {
    update({ state: 'connecting', message: null });
    openSocket(ticket.ticket);
  } else if (!socket.connected) {
    socket.auth = { ticket: ticket.ticket };
    socket.connect();
  }
}

/** Sign-out: stop everything on this phone. */
export function stopTracking(): Promise<void> {
  return stopSharing('off', null);
}

/** Ask for location access (call only after explaining why), then sync.
 * Returns whether background ("all the time") access was granted. */
export async function requestTrackingPermissions(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  let background = false;
  if (foreground.granted && !isExpoGo) {
    // Android 11+ sends the ISR to Settings to pick "Allow all the time".
    background = (await Location.requestBackgroundPermissionsAsync()).granted;
  }
  await syncTracking();
  return background;
}

/** Whether tracking still needs a permission the ISR can grant. */
export async function missingTrackingPermission(): Promise<'foreground' | 'background' | null> {
  if (!(await Location.getForegroundPermissionsAsync()).granted) return 'foreground';
  if (!isExpoGo && !(await Location.getBackgroundPermissionsAsync()).granted) return 'background';
  return null;
}
