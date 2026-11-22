import { STORAGE_PREFIX } from '@/config/constants';
import type { AuthSession } from '@/types';

const SESSION_KEY = `${STORAGE_PREFIX}.session`;

/**
 * Persistencia de la sesión. Se usa sessionStorage: la sesión simulada
 * se descarta al cerrar la pestaña.
 */
export const authStorage = {
  getSession(): AuthSession | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as AuthSession;
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },
  setSession(session: AuthSession): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },
  clear(): void {
    sessionStorage.removeItem(SESSION_KEY);
  },
  getToken(): string | null {
    return this.getSession()?.token ?? null;
  },
};
