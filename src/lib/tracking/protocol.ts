/**
 * The realtime location service's wire protocol and reporting policy — copied
 * from deedar-drive's `src/lib/tracking/protocol.ts` (which ws-server also
 * copies). Keep all three in step: the event names and payloads must match.
 */

export type LocationReport = {
  lat: number;
  lng: number;
  accuracyM?: number | null;
  /** Device clock time of the fix (ms epoch). */
  recordedAt: number;
};

export type LocationAck = { ok: true; at: number } | { ok: false; error: string };

export type ServerToClientEvents = {
  ready: (payload: { role: 'rep' | 'watcher' }) => void;
  trackingError: (payload: { message: string }) => void;
};

export type ClientToServerEvents = {
  location: (payload: LocationReport, ack?: (res: LocationAck) => void) => void;
};

/** Minimum movement before an update is sent, in metres. */
export const MIN_MOVE_METERS = 15;
/** Send at least this often even when standing still (ms). */
export const HEARTBEAT_MS = 60_000;
/** A position older than this is shown as stale (ms). */
export const STALE_AFTER_MS = 5 * 60_000;

/** Great-circle distance in metres between two WGS84 points (haversine). */
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(toRad(aLat)) * Math.cos(toRad(bLat));
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "450 m" / "2.3 km" / "14 km" — the website's `distanceLabel`. */
export function distanceLabel(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(metres < 10_000 ? 1 : 0)} km`;
}
