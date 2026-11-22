import { env } from '@/config/env';
import { DEMO_USERS } from '@/data/users';
import type { AuthSession, Role } from '@/types';
import { apiClient, mockResponse } from './apiClient';
import { authStorage } from './authStorage';

const SESSION_HOURS = 8;

function buildDemoSession(role: Role): AuthSession {
  return {
    user: DEMO_USERS[role],
    token: `demo-token-${role}-${Date.now()}`,
    expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString(),
  };
}

export const authService = {
  /**
   * Acceso simulado por rol. En producción se reemplaza por
   * `POST /auth/login` con credenciales reales.
   */
  async loginAsRole(role: Role): Promise<AuthSession> {
    const session = env.useMocks
      ? await mockResponse(buildDemoSession(role), 600)
      : await apiClient.post<AuthSession>('/auth/demo-login', { role });

    authStorage.setSession(session);
    return session;
  },

  logout(): void {
    authStorage.clear();
    // Producción: apiClient.post('/auth/logout')
  },

  getCurrentSession(): AuthSession | null {
    return authStorage.getSession();
  },
};
