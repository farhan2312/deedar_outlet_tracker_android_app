/** `GET /api/mobile/counters/new` — `getNewCounterForm` in deedar-drive. */
export type NewCounterForm =
  | { ok: false; message: string; startDayFirst?: boolean }
  | {
      ok: true;
      depot: { id: string; name: string };
      cnfName: string;
      areas: { id: string; name: string }[];
      counterTypes: string[];
    };

/** `GET /api/mobile/counters/check-duplicate` — the website's `checkDuplicate`. */
export type DuplicateMatch = {
  id: string;
  name: string;
  type: string;
  area: string;
  stockistName: string;
  canVisit: boolean;
} | null;
