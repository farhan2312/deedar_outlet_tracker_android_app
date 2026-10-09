import { colorScheme } from 'nativewind';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { loadThemePreference, saveThemePreference } from './storage';

export type ThemePreference = 'light' | 'dark' | 'system';

/** Apply a preference; never let a refusal (e.g. a browser preview without
 * class-based dark mode) break the app — it just stays as it is. */
function apply(value: ThemePreference) {
  try {
    colorScheme.set(value);
  } catch {
    // Keep the current scheme.
  }
}

type ThemeContextValue = {
  preference: ThemePreference;
  /** False until the saved choice has been applied (the splash waits for it). */
  ready: boolean;
  setPreference: (value: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Light, dark, or follow the phone. Light is the default, matching the web
 * portal. Applied through NativeWind's colour scheme, which switches every
 * CSS-variable colour (and `useColors()`) at once.
 */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadThemePreference().then((saved) => {
      if (cancelled) return;
      const value = saved ?? 'light';
      apply(value);
      setPreferenceState(value);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setPreference(value: ThemePreference) {
    apply(value);
    setPreferenceState(value);
    void saveThemePreference(value);
  }

  return <ThemeContext value={{ preference, ready, setPreference }}>{children}</ThemeContext>;
}

export function useThemePreference(): ThemeContextValue {
  const value = use(ThemeContext);
  if (!value) throw new Error('useThemePreference must be used inside <ThemePreferenceProvider>.');
  return value;
}
