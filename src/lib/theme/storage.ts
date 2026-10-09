import * as SecureStore from 'expo-secure-store';

import type { ThemePreference } from './preference';

const KEY = 'deedar.theme';

export async function loadThemePreference(): Promise<ThemePreference | null> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : null;
  } catch {
    return null;
  }
}

export async function saveThemePreference(value: ThemePreference): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, value);
  } catch {
    // Not remembered — the theme still changes for this session.
  }
}
