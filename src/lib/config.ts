/**
 * Server addresses, read from `EXPO_PUBLIC_*` env vars (see `.env.example`).
 * Expo inlines these at bundle time, so a change needs a dev-server restart.
 *
 * - API_URL: the Next.js web portal (deedar-drive), which serves /api/mobile/*.
 * - WS_URL: the realtime location service (ws-server).
 */
export const API_URL = requireUrl('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL);
export const WS_URL = requireUrl('EXPO_PUBLIC_WS_URL', process.env.EXPO_PUBLIC_WS_URL);

function requireUrl(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set — copy .env.example to .env.local and fill it in.`);
  }
  return value.replace(/\/+$/, '');
}
