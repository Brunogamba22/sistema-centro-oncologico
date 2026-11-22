import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { adminNavigation } from '@/config/navigation';
import { ADMIN_PANEL_ROLES } from '@/config/roles';
import { AdminLayout } from '@/layouts/AdminLayout';
import { buildPanelRoutes, type PageRegistry } from './buildPanelRoutes';
import { RequireRole } from './RequireRole';

const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const AppointmentsPage = lazy(() => import('@/pages/admin/AppointmentsPage'));
const MedicalAgendaPage = lazy(() => import('@/pages/admin/MedicalAgendaPage'));
const PatientsPage = lazy(() => import('@/pages/admin/PatientsPage'));
const PatientDetailPage = lazy(() => import('@/pages/admin/PatientDetailPage'));
const DoctorsPage = lazy(() => import('@/pages/admin/DoctorsPage'));
const SpecialtiesPage = lazy(() => import('@/pages/admin/SpecialtiesPage'));
const MedicalRequestsPage = lazy(() => import('@/pages/admin/MedicalRequestsPage'));
const WhatsAppInboxPage = lazy(() => import('@/pages/admin/WhatsAppInboxPage'));
const NotificationsPage = lazy(() => import('@/pages/admin/NotificationsPage'));
const UsersPermissionsPage = lazy(() => import('@/pages/admin/UsersPermissionsPage'));
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage'));
const AuditPage = lazy(() => import('@/pages/admin/AuditPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));

/** Páginas del Panel Administrativo (carga diferida por pantalla). */
const adminPages: PageRegistry = {
  dashboard: DashboardPage,
  turnos: AppointmentsPage,
  agenda: MedicalAgendaPage,
  pacientes: PatientsPage,
  medicos: DoctorsPage,
  especialidades: SpecialtiesPage,
  solicitudes: MedicalRequestsPage,
  whatsapp: WhatsAppInboxPage,
  notificaciones: NotificationsPage,
  usuarios: UsersPermissionsPage,
  reportes: ReportsPage,
  auditoria: AuditPage,
  configuracion: SettingsPage,
};

export const adminRoutes: RouteObject = {
  path: '/admin',
  element: (
    <RequireRole roles={ADMIN_PANEL_ROLES} mode="redirect">
      <AdminLayout />
    </RequireRole>
  ),
  children: [
    ...buildPanelRoutes(adminNavigation, adminPages),
    {
      path: 'pacientes/:patientId',
      element: (
        <RequireRole roles={ADMIN_PANEL_ROLES} mode="deny">
          <PatientDetailPage />
        </RequireRole>
      ),
    },
  ],
};
