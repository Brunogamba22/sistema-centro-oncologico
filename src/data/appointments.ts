/**
 * DATOS FICTICIOS — agenda de turnos generada en relación a la fecha actual
 * para que las vistas "Hoy", "Esta semana" y "Este mes" muestren actividad realista.
 */
import type { Appointment, AppointmentStatus, AppointmentType, Channel } from '@/types';
import { addDays, addMinutesToTime, combineDateAndTime, toDateKey } from '@/utils/date';

const TODAY = new Date();
const TS = { createdAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-18T12:00:00.000Z' };

interface SeedAppointment {
  id: string;
  dayOffset: number;
  time: string;
  duration?: number;
  patientId: string;
  doctorId: string;
  specialtyId: string;
  status: AppointmentStatus;
  type: AppointmentType;
  channel: Channel;
  notes?: string;
}

const SEEDS: SeedAppointment[] = [
  // Hoy (dayOffset: 0)
  { id: 'apt-001', dayOffset: 0, time: '08:20', patientId: 'pat-001', doctorId: 'doc-001', specialtyId: 'esp-001', status: 'atendido', type: 'control', channel: 'whatsapp', notes: 'Control previo a ciclo 4.' },
  { id: 'apt-002', dayOffset: 0, time: '09:00', patientId: 'pat-002', doctorId: 'doc-002', specialtyId: 'esp-002', status: 'en_atencion', type: 'control', channel: 'telefono', notes: 'Trae hemograma actualizado.' },
  { id: 'apt-003', dayOffset: 0, time: '09:40', patientId: 'pat-005', doctorId: 'doc-001', specialtyId: 'esp-001', status: 'en_espera', type: 'tratamiento', channel: 'whatsapp', duration: 40, notes: 'Sesión programada en hospital de día.' },
  { id: 'apt-004', dayOffset: 0, time: '10:20', patientId: 'pat-003', doctorId: 'doc-005', specialtyId: 'esp-005', status: 'confirmado', type: 'control', channel: 'presencial' },
  { id: 'apt-005', dayOffset: 0, time: '11:00', patientId: 'pat-004', doctorId: 'doc-003', specialtyId: 'esp-003', status: 'confirmado', type: 'tratamiento', channel: 'whatsapp' },
  { id: 'apt-006', dayOffset: 0, time: '11:40', patientId: 'pat-007', doctorId: 'doc-005', specialtyId: 'esp-005', status: 'pendiente', type: 'estudio', channel: 'web', notes: 'Falta confirmar asistencia por WhatsApp.' },
  { id: 'apt-007', dayOffset: 0, time: '13:20', patientId: 'pat-008', doctorId: 'doc-006', specialtyId: 'esp-006', status: 'confirmado', type: 'control', channel: 'telefono' },
  { id: 'apt-008', dayOffset: 0, time: '14:40', patientId: 'pat-006', doctorId: 'doc-004', specialtyId: 'esp-004', status: 'pendiente', type: 'control', channel: 'whatsapp' },
  { id: 'apt-009', dayOffset: 0, time: '15:20', patientId: 'pat-015', doctorId: 'doc-001', specialtyId: 'esp-001', status: 'cancelado', type: 'control', channel: 'whatsapp', notes: 'Paciente reprogramará para la semana próxima.' },
  { id: 'apt-010', dayOffset: 0, time: '16:00', patientId: 'pat-013', doctorId: 'doc-006', specialtyId: 'esp-006', status: 'confirmado', type: 'control', channel: 'presencial' },

  // Ayer y días previos de la semana
  { id: 'apt-011', dayOffset: -1, time: '08:40', patientId: 'pat-010', doctorId: 'doc-003', specialtyId: 'esp-003', status: 'atendido', type: 'tratamiento', channel: 'whatsapp' },
  { id: 'apt-012', dayOffset: -1, time: '09:20', patientId: 'pat-009', doctorId: 'doc-007', specialtyId: 'esp-007', status: 'atendido', type: 'control', channel: 'web' },
  { id: 'apt-013', dayOffset: -1, time: '10:00', patientId: 'pat-012', doctorId: 'doc-002', specialtyId: 'esp-002', status: 'ausente', type: 'primera_vez', channel: 'telefono', notes: 'No concurrió al turno.' },
  { id: 'apt-014', dayOffset: -1, time: '11:20', patientId: 'pat-014', doctorId: 'doc-004', specialtyId: 'esp-004', status: 'atendido', type: 'control', channel: 'presencial' },
  { id: 'apt-015', dayOffset: -2, time: '08:20', patientId: 'pat-001', doctorId: 'doc-001', specialtyId: 'esp-001', status: 'atendido', type: 'estudio', channel: 'whatsapp' },
  { id: 'apt-016', dayOffset: -2, time: '09:40', patientId: 'pat-011', doctorId: 'doc-001', specialtyId: 'esp-001', status: 'atendido', type: 'control', channel: 'presencial' },
  { id: 'apt-017', dayOffset: -2, time: '11:00', patientId: 'pat-002', doctorId: 'doc-002', specialtyId: 'esp-002', status: 'cancelado', type: 'control', channel: 'whatsapp' },
  { id: 'apt-018', dayOffset: -3, time: '09:00', patientId: 'pat-007', doctorId: 'doc-005', specialtyId: 'esp-005', status: 'atendido', type: 'control', channel: 'whatsapp' },
  { id: 'apt-019', dayOffset: -3, time: '10:40', patientId: 'pat-004', doctorId: 'doc-003', specialtyId: 'esp-003', status: 'atendido', type: 'tratamiento', channel: 'presencial' },
  { id: 'apt-020', dayOffset: -3, time: '14:20', patientId: 'pat-006', doctorId: 'doc-004', specialtyId: 'esp-004', status: 'reprogramado', type: 'control', channel: 'telefono' },
  { id: 'apt-021', dayOffset: -4, time: '08:40', patientId: 'pat-015', doctorId: 'doc-001', specialtyId: 'esp-001', status: 'atendido', type: 'tratamiento', channel: 'whatsapp' },
  { id: 'apt-022', dayOffset: -4, time: '10:00', patientId: 'pat-009', doctorId: 'doc-007', specialtyId: 'esp-007', status: 'atendido', type: 'control', channel: 'web' },
  { id: 'apt-023', dayOffset: -5, time: '09:20', patientId: 'pat-013', doctorId: 'doc-006', specialtyId: 'esp-006', status: 'atendido', type: 'control', channel: 'telefono' },
  { id: 'apt-024', dayOffset: -5, time: '11:40', patientId: 'pat-010', doctorId: 'doc-003', specialtyId: 'esp-003', status: 'cancelado', type: 'tratamiento', channel: 'whatsapp' },

  // Próximos días (dayOffset: +1 a +10)
  { id: 'apt-025', dayOffset: 1, time: '08:20', patientId: 'pat-005', doctorId: 'doc-001', specialtyId: 'esp-001', status: 'confirmado', type: 'control', channel: 'whatsapp' },
  { id: 'apt-026', dayOffset: 1, time: '09:40', patientId: 'pat-012', doctorId: 'doc-002', specialtyId: 'esp-002', status: 'pendiente', type: 'primera_vez', channel: 'web', notes: 'Paciente reprogramó primera consulta.' },
  { id: 'apt-027', dayOffset: 1, time: '10:20', patientId: 'pat-009', doctorId: 'doc-007', specialtyId: 'esp-007', status: 'confirmado', type: 'control', channel: 'whatsapp' },
  { id: 'apt-028', dayOffset: 1, time: '14:00', patientId: 'pat-014', doctorId: 'doc-004', specialtyId: 'esp-004', status: 'pendiente', type: 'control', channel: 'telefono' },
  { id: 'apt-029', dayOffset: 2, time: '08:00', patientId: 'pat-010', doctorId: 'doc-003', specialtyId: 'esp-003', status: 'confirmado', type: 'tratamiento', channel: 'whatsapp' },
  { id: 'apt-030', dayOffset: 2, time: '10:40', patientId: 'pat-003', doctorId: 'doc-005', specialtyId: 'esp-005', status: 'confirmado', type: 'estudio', channel: 'presencial' },
  { id: 'apt-031', dayOffset: 2, time: '13:40', patientId: 'pat-008', doctorId: 'doc-006', specialtyId: 'esp-006', status: 'pendiente', type: 'control', channel: 'whatsapp' },
  { id: 'apt-032', dayOffset: 3, time: '09:00', patientId: 'pat-001', doctorId: 'doc-001', specialtyId: 'esp-001', status: 'confirmado', type: 'tratamiento', channel: 'whatsapp', duration: 40 },
  { id: 'apt-033', dayOffset: 3, time: '11:00', patientId: 'pat-002', doctorId: 'doc-002', specialtyId: 'esp-002', status: 'pendiente', type: 'control', channel: 'telefono' },
  { id: 'apt-034', dayOffset: 4, time: '08:40', patientId: 'pat-004', doctorId: 'doc-003', specialtyId: 'esp-003', status: 'confirmado', type: 'tratamiento', channel: 'whatsapp' },
  { id: 'apt-035', dayOffset: 5, time: '10:00', patientId: 'pat-007', doctorId: 'doc-005', specialtyId: 'esp-005', status: 'confirmado', type: 'control', channel: 'web' },
  { id: 'apt-036', dayOffset: 7, time: '09:20', patientId: 'pat-015', doctorId: 'doc-001', specialtyId: 'esp-001', status: 'reprogramado', type: 'control', channel: 'whatsapp' },
];

export const appointments: Appointment[] = SEEDS.map((seed) => {
  const dateKey = toDateKey(addDays(TODAY, seed.dayOffset));
  const duration = seed.duration ?? 20;
  return {
    id: seed.id,
    patientId: seed.patientId,
    doctorId: seed.doctorId,
    specialtyId: seed.specialtyId,
    startAt: combineDateAndTime(dateKey, seed.time),
    endAt: combineDateAndTime(dateKey, addMinutesToTime(seed.time, duration)),
    status: seed.status,
    type: seed.type,
    channel: seed.channel,
    notes: seed.notes,
    ...TS,
  };
});
