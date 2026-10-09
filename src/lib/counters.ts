/** `/api/mobile/counters` — the website's `fetchCountersList` page, plus the
 * ISR's `canVisit` / `visitedToday` per row. */
export type CountersPage =
  | { assigned: false; message: string }
  | {
      assigned: true;
      scope: string;
      rows: CounterRow[];
      total: number;
      page: number;
      totalPages: number;
      pageSize: number;
      areaOptions: { id: string; name: string }[];
      filters: { q: string; areaId: string | null; stockistId: string | null };
    };

export type CounterRow = {
  id: string;
  name: string;
  phone: string | null;
  type: string;
  areaId: string;
  areaName: string;
  stockistId: string;
  stockistName: string;
  status: string;
  canVisit: boolean;
  visitedToday: boolean;
};
