import type { RouteObject } from 'react-router-dom';
import { adminNavigation } from '@/config/navigation';
import { ADMIN_PANEL_ROLES } from '@/config/roles';
import { AdminLayout } from '@/layouts/AdminLayout';
import { buildPanelRoutes, type PageRegistry } from './buildPanelRoutes';
import { RequireRole } from './RequireRole';

/**
 * Páginas del Panel Administrativo (carga diferida por pantalla).
 * Se completan en las fases 2 y 3, p. ej.:
 *   dashboard: lazy(() => import('@/pages/admin/DashboardPage')),
 */
const adminPages: PageRegistry = {};

export const adminRoutes: RouteObject = {
  path: '/admin',
  element: (
    <RequireRole roles={ADMIN_PANEL_ROLES} mode="redirect">
      <AdminLayout />
    </RequireRole>
  ),
  children: [
    ...buildPanelRoutes(adminNavigation, adminPages),
    // Rutas de detalle (fuera del menú) — Fase 2:
    // { path: 'pacientes/:patientId', element: <PatientDetailPage /> },
  ],
};
