import type { RouteObject } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { doctorNavigation } from '@/config/navigation';
import { DOCTOR_PANEL_ROLES } from '@/config/roles';
import { DoctorLayout } from '@/layouts/DoctorLayout';
import ComingSoonPage from '@/pages/system/ComingSoonPage';
import { buildPanelRoutes, type PageRegistry } from './buildPanelRoutes';
import { RequireRole } from './RequireRole';

/** Páginas del Panel Médico (Fase 4). */
const doctorPages: PageRegistry = {};

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
        <ComingSoonPage
          title="Perfil del paciente"
          description="Resumen clínico, plan de tratamiento, historial de turnos y documentación del paciente."
          phase={4}
          icon={UserRound}
        />
      ),
    },
  ],
};
