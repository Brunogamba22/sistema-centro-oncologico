/**
 * DATOS FICTICIOS — sedes, consultorios y configuración institucional (Argentina).
 */
import type { ClinicSite, ConsultingRoom, InstitutionSettings } from '@/types';

export const initialSettings: InstitutionSettings = {
  name: 'Centro Oncológico Integral',
  shortName: 'COI',
  cuit: '30-71000999-4',
  phone: '+54 11 4000-0000',
  whatsapp: '+54 9 11 4000-0000',
  email: 'contacto@centro-oncologico.demo',
  website: 'https://centro-oncologico.demo',
  timezone: 'America/Argentina/Buenos_Aires',
  defaultSlotMinutes: 20,
  maxAdvanceBookingDays: 60,
  reminderHoursBefore: 24,
  autoConfirmWhatsapp: true,
  requireDniValidation: true,
  enableChatbotHandoff: true,
};

export const initialSites: ClinicSite[] = [
  {
    id: 'site-001',
    name: 'Sede Central CABA',
    address: 'Av. Ejemplo 1234',
    city: 'CABA',
    province: 'Ciudad Autónoma de Buenos Aires',
    phone: '+54 11 4000-0001',
    email: 'central@centro-oncologico.demo',
    hours: 'Lun a Vie 07:00 a 20:00 · Sáb 08:00 a 13:00',
    isMain: true,
    active: true,
  },
  {
    id: 'site-002',
    name: 'Sede Belgrano',
    address: 'Av. Cabildo 2850',
    city: 'CABA',
    province: 'Ciudad Autónoma de Buenos Aires',
    phone: '+54 11 4000-0002',
    email: 'belgrano@centro-oncologico.demo',
    hours: 'Lun a Vie 08:00 a 19:00',
    isMain: false,
    active: true,
  },
  {
    id: 'site-003',
    name: 'Sede Vicente López',
    address: 'Av. Maipú 1540',
    city: 'Vicente López',
    province: 'Buenos Aires',
    phone: '+54 11 4000-0003',
    email: 'vicentelopez@centro-oncologico.demo',
    hours: 'Lun a Vie 08:30 a 18:30',
    isMain: false,
    active: true,
  },
];

export const initialRooms: ConsultingRoom[] = [
  { id: 'room-001', siteId: 'site-001', name: 'Consultorio 101', floor: 'Piso 1', specialtyFocus: 'Oncología clínica', active: true },
  { id: 'room-002', siteId: 'site-001', name: 'Consultorio 102', floor: 'Piso 1', specialtyFocus: 'Hematología', active: true },
  { id: 'room-003', siteId: 'site-001', name: 'Búnker Radioterapia A', floor: 'Subsuelo', specialtyFocus: 'Radioterapia', active: true },
  { id: 'room-004', siteId: 'site-001', name: 'Hospital de Día - Box 1 a 6', floor: 'Piso 2', specialtyFocus: 'Tratamiento sistémico', active: true },
  { id: 'room-005', siteId: 'site-002', name: 'Consultorio 201', floor: 'Piso 2', specialtyFocus: 'Cirugía oncológica y Mastología', active: true },
  { id: 'room-006', siteId: 'site-002', name: 'Consultorio 202', floor: 'Piso 2', specialtyFocus: 'Psicooncología', active: true },
  { id: 'room-007', siteId: 'site-003', name: 'Consultorio 301', floor: 'Planta Baja', specialtyFocus: 'Cuidados paliativos', active: true },
  { id: 'room-008', siteId: 'site-003', name: 'Consultorio 302', floor: 'Planta Baja', specialtyFocus: 'Nutrición oncológica', active: false },
];
