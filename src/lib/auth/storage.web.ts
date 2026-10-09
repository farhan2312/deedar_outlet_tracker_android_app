import type { StoredSession } from './storage';
import type { MobileUser } from './types';

/**
 * Web-only stand-in for `storage.ts` — SecureStore doesn't exist in a browser.
 * The app ships for Android only; this exists so screens can be previewed in a
 * browser during development. Never used on a phone.
 */
const TOKEN_KEY = 'deedar.session.token';
const USER_KEY = 'deedar.session.user';

export type { StoredSession };

export async function loadSession(): Promise<StoredSession | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  const userJson = localStorage.getItem(USER_KEY);
  if (!token || !userJson) return null;
  try {
    return { token, user: JSON.parse(userJson) as MobileUser };
  } catch {
    return null;
  }
}

export async function saveSession({ token, user }: StoredSession): Promise<void> {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function saveUser(user: MobileUser): Promise<void> {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
