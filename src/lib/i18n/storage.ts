import * as SecureStore from 'expo-secure-store';

import type { Lang } from './dictionary';

const KEY = 'deedar.lang';

export async function loadLang(): Promise<Lang | null> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return v === 'en' || v === 'hi' ? v : null;
  } catch {
    return null;
  }
}

export async function saveLang(lang: Lang): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, lang);
  } catch {
    // Not remembered — the app still switches for this session.
  }
}
