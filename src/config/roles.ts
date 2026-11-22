import type { Role } from '@/types';

export interface RoleConfig {
  id: Role;
  label: string;
  description: string;
  /** Ruta de inicio del rol luego del acceso. */
  homePath: string;
  /** Panel al que pertenece el rol. */
  panel: 'admin' | 'medico';
}

export const ROLE_CONFIG: Record<Role, RoleConfig> = {
  admin: {
    id: 'admin',
    label: 'Administrador',
    description: 'Gestión integral del centro: turnos, pacientes, médicos, usuarios, reportes y auditoría.',
    homePath: '/admin',
    panel: 'admin',
  },
  medico: {
    id: 'medico',
    label: 'Médico',
    description: 'Agenda personal, pacientes, recetas, solicitudes pendientes y documentación clínica.',
    homePath: '/medico',
    panel: 'medico',
  },
  recepcionista: {
    id: 'recepcionista',
    label: 'Recepcionista',
    description: 'Atención al paciente: turnos, agenda, pacientes, solicitudes y bandeja de WhatsApp.',
    homePath: '/admin',
    panel: 'admin',
  },
};

export const ROLE_ORDER: Role[] = ['admin', 'medico', 'recepcionista'];

export const ADMIN_PANEL_ROLES: Role[] = ['admin', 'recepcionista'];
export const DOCTOR_PANEL_ROLES: Role[] = ['medico'];
