import * as SecureStore from 'expo-secure-store';

import type { MobileUser } from './types';

const TOKEN_KEY = 'deedar.session.token';
const USER_KEY = 'deedar.session.user';

export type StoredSession = { token: string; user: MobileUser };

/**
 * The session lives in SecureStore (Android Keystore-encrypted). The profile is
 * kept next to the token so the app can open straight into the ISR's screens
 * when there's no signal, instead of blocking on a server check.
 */
export async function loadSession(): Promise<StoredSession | null> {
  const [token, userJson] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);
  if (!token || !userJson) return null;
  try {
    return { token, user: JSON.parse(userJson) as MobileUser };
  } catch {
    return null;
  }
}

export async function saveSession({ token, user }: StoredSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function saveUser(user: MobileUser): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
