import { createContext } from 'react';
import type { AuthUser, Role } from '@/types';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loginAsRole: (role: Role) => Promise<AuthUser>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
