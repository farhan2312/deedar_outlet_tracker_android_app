/** `/api/mobile/beat` — see `getMobileBeat` in deedar-drive's
 * `src/lib/mobile/beat.ts`. */
export type Beat =
  | { assigned: false; message: string }
  | {
      assigned: true;
      isAdmin: boolean;
      stockistName: string;
      visitsToday: number;
      newCountersToday: number;
      remaining: number;
      beat: BeatCounter[];
    };

export type BeatCounter = {
  /** Unique per (rep, counter) — an admin can see one counter twice. */
  key: string;
  id: string;
  name: string;
  type: string;
  areaName: string;
  canVisit: boolean;
  visitedToday: boolean;
  /** The colleague who already visited today, when it wasn't this ISR. */
  lockedBy: string | null;
  /** Assigned rep — admin only. */
  repName: string | null;
};

/** `/api/mobile/counters/search` — the website's `CounterSearchResult`. */
export type CounterSearchResult =
  | { found: false }
  | { found: true; canVisit: true; id: string; name: string; type: string; area: string; stockistName: string }
  | { found: true; canVisit: false };
