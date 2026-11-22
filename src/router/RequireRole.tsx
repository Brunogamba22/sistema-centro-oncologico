import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROLE_CONFIG } from '@/config/roles';
import { useAuth } from '@/context/auth/useAuth';
import AccessDeniedPage from '@/pages/system/AccessDeniedPage';
import type { Role } from '@/types';

interface RequireRoleProps {
  /** Roles autorizados. Si se omite, alcanza con estar autenticado. */
  roles?: Role[];
  /**
   * - redirect: envía al usuario a su panel (protección de paneles completos).
   * - deny: muestra "Acceso restringido" dentro del layout (protección de secciones).
   */
  mode?: 'redirect' | 'deny';
  children: ReactNode;
}

export function RequireRole({ roles, mode = 'deny', children }: RequireRoleProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/acceso" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    const homePath = ROLE_CONFIG[user.role].homePath;
    return mode === 'redirect' ? <Navigate to={homePath} replace /> : <AccessDeniedPage homePath={homePath} />;
  }

  return <>{children}</>;
}
