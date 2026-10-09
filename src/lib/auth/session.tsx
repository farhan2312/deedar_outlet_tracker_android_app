import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { api, ApiError } from '@/lib/api';
import { stopTracking } from '@/lib/tracking/tracker';
import { clearSession, loadSession, saveSession, saveUser } from './storage';
import type { MobileUser } from './types';

/** Signing out (or being signed out) also stops live location on this phone —
 * a signed-out phone must never keep sharing. */
async function forgetSession() {
  await stopTracking().catch(() => {});
  await clearSession();
}

type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; token: string; user: MobileUser };

type SessionContextValue = {
  session: SessionState;
  signIn: (phone: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
  /** `api()` with the session token attached. A 401 (token expired or account
   * deactivated) signs the ISR out before the error is rethrown. */
  authedApi: <T>(path: string, options?: Omit<Parameters<typeof api>[1], 'token'>) => Promise<T>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>.');
  return value;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // An unreadable store (e.g. Keystore keys lost after a backup restore)
      // just means signing in again.
      const stored = await loadSession().catch(() => null);
      if (cancelled) return;
      if (!stored) {
        setSession({ status: 'signedOut' });
        return;
      }

      // Open straight away on the saved profile — an ISR out of signal can
      // still get into the app — then confirm with the server.
      setSession({ status: 'signedIn', ...stored });

      try {
        const { user } = await api<{ user: MobileUser }>('/api/mobile/me', { token: stored.token });
        if (cancelled) return;
        await saveUser(user);
        setSession({ status: 'signedIn', token: stored.token, user });
      } catch (err) {
        if (cancelled) return;
        // Expired, deactivated, or no longer an ISR → sign out. Anything else
        // (no network, server down) keeps the ISR signed in on the saved profile.
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await forgetSession();
          setSession({ status: 'signedOut' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn(phone: string, password: string) {
    const { token, user } = await api<{ token: string; user: MobileUser }>('/api/mobile/login', {
      method: 'POST',
      body: { phone: phone.trim(), password },
    });
    await saveSession({ token, user });
    setSession({ status: 'signedIn', token, user });
  }

  async function signOut() {
    if (session.status === 'signedIn') {
      // Only for the audit log — don't hold the ISR on a bad connection.
      api('/api/mobile/logout', { method: 'POST', token: session.token }).catch(() => {});
    }
    await forgetSession();
    setSession({ status: 'signedOut' });
  }

  async function authedApi<T>(path: string, options: Omit<Parameters<typeof api>[1], 'token'> = {}) {
    if (session.status !== 'signedIn') throw new ApiError(401, 'Not signed in.');
    try {
      return await api<T>(path, { ...options, token: session.token });
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized) {
        await forgetSession();
        setSession({ status: 'signedOut' });
      }
      throw err;
    }
  }

  async function changePassword(input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    if (session.status !== 'signedIn') throw new ApiError(401, 'Not signed in.');
    await authedApi('/api/mobile/change-password', { method: 'POST', body: input });
    // The server cleared mustChangePassword; mirror it so the app moves on.
    const user = { ...session.user, mustChangePassword: false };
    await saveUser(user);
    setSession({ status: 'signedIn', token: session.token, user });
  }

  return (
    <SessionContext value={{ session, signIn, signOut, changePassword, authedApi }}>
      {children}
    </SessionContext>
  );
}
