import type { Lang } from './dictionary';

/** Web-only stand-in (browser previews); the phone uses SecureStore. */
const KEY = 'deedar.lang';

export async function loadLang(): Promise<Lang | null> {
  const v = localStorage.getItem(KEY);
  return v === 'en' || v === 'hi' ? v : null;
}

export async function saveLang(lang: Lang): Promise<void> {
  localStorage.setItem(KEY, lang);
}
