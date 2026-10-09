import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY = 'deedar.device.id';

let cached: string | null = null;

/**
 * A stable id for this phone, sent when the ISR starts their day. The server
 * records it as the day's tracking owner, so only the phone that started the
 * day can share live location (same rule as the website's `getDeviceId`).
 *
 * Kept across sign-outs — it identifies the phone, not the person. Lost on
 * uninstall, which then counts as a new device.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  try {
    let id = await SecureStore.getItemAsync(KEY);
    if (!id) {
      id = Crypto.randomUUID();
      await SecureStore.setItemAsync(KEY, id);
    }
    cached = id;
    return id;
  } catch {
    // Unreadable store: no id. The server then treats this phone as
    // unclaimed rather than blocking the ISR from starting their day.
    return '';
  }
}
