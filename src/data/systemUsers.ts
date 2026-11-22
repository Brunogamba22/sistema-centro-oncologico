/**
 * DATOS FICTICIOS — usuarios del sistema y matriz de permisos por rol.
 * Recepcionista utiliza el Panel Administrativo con permisos limitados (no es un cuarto módulo).
 */
import type { Role, SystemUser } from '@/types';

const TS = { createdAt: '2026-01-15T12:00:00.000Z', updatedAt: '2026-11-18T14:00:00.000Z' };

export const initialSystemUsers: SystemUser[] = [
  {
    id: 'usr-001',
    name: 'Mariana Sosa',
    email: 'mariana.sosa@centro-oncologico.demo',
    role: 'admin',
    position: 'Administradora general',
    active: true,
    siteId: 'site-001',
    lastLoginAt: '2026-11-22T01:40:00.000Z',
    ...TS,
  },
  {
    id: 'usr-002',
    name: 'Dr. Martín Ferreyra',
    email: 'martin.ferreyra@centro-oncologico.demo',
    role: 'medico',
    position: 'Oncología clínica',
    active: true,
    doctorId: 'doc-001',
    siteId: 'site-001',
    lastLoginAt: '2026-11-21T19:15:00.000Z',
    ...TS,
  },
  {
    id: 'usr-003',
    name: 'Lucía Benítez',
    email: 'lucia.benitez@centro-oncologico.demo',
    role: 'recepcionista',
    position: 'Recepción y admisión',
    active: true,
    siteId: 'site-001',
    lastLoginAt: '2026-11-22T00:50:00.000Z',
    ...TS,
  },
  {
    id: 'usr-004',
    name: 'Dra. Carolina Ibarra',
    email: 'carolina.ibarra@centro-oncologico.demo',
    role: 'medico',
    position: 'Hematología',
    active: true,
    doctorId: 'doc-002',
    siteId: 'site-001',
    lastLoginAt: '2026-11-21T15:30:00.000Z',
    ...TS,
  },
  {
    id: 'usr-005',
    name: 'Sofía Pereyra',
    email: 'sofia.pereyra@centro-oncologico.demo',
    role: 'recepcionista',
    position: 'Atención al paciente · Sede Belgrano',
    active: true,
    siteId: 'site-002',
    lastLoginAt: '2026-11-21T18:05:00.000Z',
    ...TS,
  },
  {
    id: 'usr-006',
    name: 'Federico Alarcón',
    email: 'federico.alarcon@centro-oncologico.demo',
    role: 'admin',
    position: 'Coordinador operativo',
    active: true,
    siteId: 'site-002',
    lastLoginAt: '2026-11-20T16:20:00.000Z',
    ...TS,
  },
  {
    id: 'usr-007',
    name: 'Dr. Sebastián Correa',
    email: 'sebastian.correa@centro-oncologico.demo',
    role: 'medico',
    position: 'Oncología clínica (licencia)',
    active: false,
    doctorId: 'doc-008',
    siteId: 'site-003',
    lastLoginAt: '2026-10-05T11:00:00.000Z',
    ...TS,
  },
];

export type PermissionLevel = 'full' | 'limited' | 'readonly' | 'none';

export interface RolePermissionMatrixRow {
  module: string;
  scope: 'Administrativo' | 'Clínico';
  permissions: Record<Role, { level: PermissionLevel; detail: string }>;
}

export const ROLE_PERMISSION_MATRIX: RolePermissionMatrixRow[] = [
  {
    module: 'Dashboard y Turnos',
    scope: 'Administrativo',
    permissions: {
      admin: { level: 'full', detail: 'Gestión completa' },
      recepcionista: { level: 'full', detail: 'Alta, edición y reprogramación' },
      medico: { level: 'none', detail: 'Sin acceso al panel admin' },
    },
  },
  {
    module: 'Agenda médica y Pacientes (datos adm.)',
    scope: 'Administrativo',
    permissions: {
      admin: { level: 'full', detail: 'Gestión completa y bloqueos' },
      recepcionista: { level: 'full', detail: 'Gestión operativa' },
      medico: { level: 'none', detail: 'Usa su agenda en Panel Médico' },
    },
  },
  {
    module: 'Médicos',
    scope: 'Administrativo',
    permissions: {
      admin: { level: 'full', detail: 'Alta, edición y estado' },
      recepcionista: { level: 'readonly', detail: 'Solo consulta de horarios y sedes' },
      medico: { level: 'none', detail: 'Edita su perfil en Panel Médico' },
    },
  },
  {
    module: 'Especialidades',
    scope: 'Administrativo',
    permissions: {
      admin: { level: 'full', detail: 'Catálogo y duraciones' },
      recepcionista: { level: 'none', detail: 'Restringido a Administrador' },
      medico: { level: 'none', detail: 'Sin acceso' },
    },
  },
  {
    module: 'Solicitudes médicas (seguimiento)',
    scope: 'Administrativo',
    permissions: {
      admin: { level: 'full', detail: 'Seguimiento, derivación y entrega' },
      recepcionista: { level: 'limited', detail: 'Registro, derivación y entrega' },
      medico: { level: 'none', detail: 'Aprobación clínica en Panel Médico' },
    },
  },
  {
    module: 'WhatsApp y Notificaciones',
    scope: 'Administrativo',
    permissions: {
      admin: { level: 'full', detail: 'Bandeja, envíos y reglas' },
      recepcionista: { level: 'limited', detail: 'Bandeja y envíos (sin editar reglas)' },
      medico: { level: 'none', detail: 'Notificaciones propias en Panel Médico' },
    },
  },
  {
    module: 'Usuarios, Reportes, Auditoría y Config.',
    scope: 'Administrativo',
    permissions: {
      admin: { level: 'full', detail: 'Control total del sistema' },
      recepcionista: { level: 'none', detail: 'Restringido a Administrador' },
      medico: { level: 'none', detail: 'Restringido a Administrador' },
    },
  },
  {
    module: 'Historia clínica, Recetas y Documentación',
    scope: 'Clínico',
    permissions: {
      admin: { level: 'none', detail: 'Separación clínica estricta' },
      recepcionista: { level: 'none', detail: 'Sin acceso a datos clínicos' },
      medico: { level: 'full', detail: 'Acceso exclusivo en Panel Médico' },
    },
  },
];
