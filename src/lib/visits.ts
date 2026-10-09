import type { Product } from '@/lib/day-log';

export type VisitItem = { segment: string; stock: number; sold: number };

export type VisitFormOptions = {
  products: Product[];
  competitors: { value: string; label: string }[];
  /** 1–5, and null for "N/A". */
  ranks: (number | null)[];
};

/** What the counter page's main button does today. */
export type CounterAction =
  | { kind: 'add_visit' }
  | { kind: 'edit_today'; visitId: string }
  | { kind: 'start_day_first' }
  | { kind: 'visited_by_other'; byName: string; atLabel: string }
  | { kind: 'not_your_stockist'; stockistName: string };

/** `/api/mobile/counters/[id]` — `getMobileCounter` in deedar-drive. */
export type CounterPage = {
  counter: {
    id: string;
    name: string;
    phone: string | null;
    typeLabel: string;
    areaName: string;
    cnfName: string;
    stockistName: string;
    gps: string | null;
  };
  action: CounterAction;
  editWindowLeft: string | null;
  history: {
    id: string;
    dateLabel: string;
    timeLabel: string;
    repName: string;
    durationLabel: string | null;
    items: VisitItem[];
    rankLabel: string;
    competitorLabel: string;
    remarks: string | null;
    editable: boolean;
  }[];
  options: VisitFormOptions;
};

/** `GET /api/mobile/visits/[visitId]`. */
export type EditableVisit = {
  visit: {
    counterId: string;
    rank: number | null;
    competitor: string | null;
    competitorBrand: string;
    remarks: string;
    items: VisitItem[];
  };
  counter: { id: string; name: string; subtitle: string };
  options: VisitFormOptions;
};

/** The body of a create/update — `VisitInput` on the server. */
export type VisitInput = {
  items: VisitItem[];
  rank: number | null;
  competitor: string;
  competitorBrand: string;
  remarks: string;
  durationSeconds: number | null;
};

export const START_DAY_MESSAGE = 'Start your day log before adding counters or visits.';
