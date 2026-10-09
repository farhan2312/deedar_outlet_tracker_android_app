/** Packet count per SKU, keyed by the product value (DG10, DG20, …). */
export type SkuQty = Record<string, number>;

export type Product = { value: string; label: string };

/** `/api/mobile/day-log` — see `getMobileDayLog` in deedar-drive's
 * `src/lib/mobile/day-log.ts`. */
export type DayLog = {
  greeting: string;
  todayLabel: string;
  products: Product[];
  today: {
    started: boolean;
    ended: boolean;
    startLabel: string;
    endLabel: string;
    onJobLabel: string;
    pickup: SkuQty;
    remaining: SkuQty;
    soldToday: SkuQty;
    expectedRemaining: SkuQty;
    pickupTotal: number;
    remainingTotal: number;
    soldTotal: number;
  };
  week: {
    daysLogged: number;
    onJobLabel: string;
    pct: number;
  };
  history: {
    logDate: string;
    dateLabel: string;
    startLabel: string;
    endLabel: string;
    onJobLabel: string;
    pickupTotal: number;
    remainingTotal: number;
  }[];
};

export function zeroQty(products: Product[]): SkuQty {
  return Object.fromEntries(products.map((p) => [p.value, 0]));
}

export function totalOf(qty: SkuQty): number {
  return Object.values(qty).reduce((sum, n) => sum + n, 0);
}
