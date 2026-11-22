import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { doctorNavigation } from '@/config/navigation';
import { DOCTOR_PANEL_ROLES } from '@/config/roles';
import { DoctorLayout } from '@/layouts/DoctorLayout';
import { buildPanelRoutes, type PageRegistry } from './buildPanelRoutes';
import { RequireRole } from './RequireRole';

const DoctorDashboardPage = lazy(() => import('@/pages/doctor/DoctorDashboardPage'));
const DoctorAgendaPage = lazy(() => import('@/pages/doctor/DoctorAgendaPage'));
const DoctorPatientsPage = lazy(() => import('@/pages/doctor/DoctorPatientsPage'));
const DoctorPatientDetailPage = lazy(() => import('@/pages/doctor/DoctorPatientDetailPage'));
const DoctorHistoryPage = lazy(() => import('@/pages/doctor/DoctorHistoryPage'));
const DoctorPrescriptionsPage = lazy(() => import('@/pages/doctor/DoctorPrescriptionsPage'));
const DoctorPendingRequestsPage = lazy(() => import('@/pages/doctor/DoctorPendingRequestsPage'));
const DoctorDocumentsPage = lazy(() => import('@/pages/doctor/DoctorDocumentsPage'));
const DoctorNotificationsPage = lazy(() => import('@/pages/doctor/DoctorNotificationsPage'));
const DoctorProfilePage = lazy(() => import('@/pages/doctor/DoctorProfilePage'));

/** Páginas del Panel Médico (Fase 4 — carga diferida por pantalla). */
const doctorPages: PageRegistry = {
  dashboard: DoctorDashboardPage,
  agenda: DoctorAgendaPage,
  pacientes: DoctorPatientsPage,
  historial: DoctorHistoryPage,
  recetas: DoctorPrescriptionsPage,
  pendientes: DoctorPendingRequestsPage,
  documentacion: DoctorDocumentsPage,
  notificaciones: DoctorNotificationsPage,
  perfil: DoctorProfilePage,
};

export const doctorRoutes: RouteObject = {
  path: '/medico',
  element: (
    <RequireRole roles={DOCTOR_PANEL_ROLES} mode="redirect">
      <DoctorLayout />
    </RequireRole>
  ),
  children: [
    ...buildPanelRoutes(doctorNavigation, doctorPages),
    {
      path: 'pacientes/:patientId',
      element: (
        <RequireRole roles={DOCTOR_PANEL_ROLES} mode="deny">
          <DoctorPatientDetailPage />
        </RequireRole>
      ),
    },
  ],
};
