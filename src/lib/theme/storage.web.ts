import type { ThemePreference } from './preference';

/** Web-only stand-in (browser previews); the phone uses SecureStore. */
const KEY = 'deedar.theme';

export async function loadThemePreference(): Promise<ThemePreference | null> {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : null;
}

export async function saveThemePreference(value: ThemePreference): Promise<void> {
  localStorage.setItem(KEY, value);
}
