/** The signed-in ISR, as returned by `/api/mobile/login` and `/api/mobile/me`
 * (`toMobileUser` in deedar-drive's `src/lib/mobile/auth.ts`). */
export type MobileUser = {
  id: string;
  name: string;
  phone: string;
  mustChangePassword: boolean;
  depot: { id: string; name: string } | null;
  areas: { id: string; name: string }[];
  reportsTo: { id: string; name: string } | null;
};
