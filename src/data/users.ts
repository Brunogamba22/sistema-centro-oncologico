/**
 * DATOS FICTICIOS — usuarios de demostración para el acceso simulado.
 * Nombres, correos y teléfonos son inventados.
 */
import type { AuthUser, Role } from '@/types';

export const DEMO_USERS: Record<Role, AuthUser> = {
  admin: {
    id: 'usr-001',
    name: 'Mariana Sosa',
    email: 'mariana.sosa@centro-oncologico.demo',
    role: 'admin',
    position: 'Administradora general',
  },
  medico: {
    id: 'usr-002',
    name: 'Dr. Martín Ferreyra',
    email: 'martin.ferreyra@centro-oncologico.demo',
    role: 'medico',
    position: 'Oncología clínica',
    doctorId: 'doc-001',
  },
  recepcionista: {
    id: 'usr-003',
    name: 'Lucía Benítez',
    email: 'lucia.benitez@centro-oncologico.demo',
    role: 'recepcionista',
    position: 'Recepción y admisión',
  },
};
