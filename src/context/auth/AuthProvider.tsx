import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { authService } from '@/services/authService';
import type { AuthUser, Role } from '@/types';
import { AuthContext, type AuthContextValue } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authService.getCurrentSession()?.user ?? null);

  const loginAsRole = useCallback(async (role: Role) => {
    const session = await authService.loginAsRole(role);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles: Role[]) => (user ? roles.includes(user.role) : false), [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, loginAsRole, logout, hasRole }),
    [user, loginAsRole, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
