import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { translate, type Lang, type Vars } from './dictionary';
import { loadLang, saveLang } from './storage';

export type TFunction = (key: string, vars?: Vars) => string;

type LanguageContextValue = {
  lang: Lang;
  /** False until the saved choice has been read (the splash waits for it). */
  ready: boolean;
  setLang: (lang: Lang) => void;
  t: TFunction;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** The language for code outside React (kept in step by the provider). */
let current: Lang = 'en';
export function tNow(key: string, vars?: Vars): string {
  return translate(current, key, vars);
}

/**
 * English or Hindi, like the website's language toggle. English is the
 * default; the choice is remembered on the phone.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLang().then((saved) => {
      if (cancelled) return;
      if (saved) {
        current = saved;
        setLangState(saved);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setLang(next: Lang) {
    current = next;
    setLangState(next);
    void saveLang(next);
  }

  const t: TFunction = (key, vars) => translate(lang, key, vars);

  return <LanguageContext value={{ lang, ready, setLang, t }}>{children}</LanguageContext>;
}

export function useLanguage(): LanguageContextValue {
  const value = use(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside <LanguageProvider>.');
  return value;
}

/** `t('Check in')`, `t('{n} remaining', { n: 3 })`. */
export function useT(): TFunction {
  return useLanguage().t;
}
