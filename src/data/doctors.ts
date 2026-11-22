/**
 * DATOS FICTICIOS — profesionales inventados. Las matrículas no corresponden a personas reales.
 */
import type { Doctor, WeeklySchedule } from '@/types';

const weekdays = (start: string, end: string, days: WeeklySchedule['dayOfWeek'][]): WeeklySchedule[] =>
  days.map((dayOfWeek) => ({ dayOfWeek, startTime: start, endTime: end, slotMinutes: 20 }));

const TS = { createdAt: '2026-01-10T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z' };

export const doctors: Doctor[] = [
  {
    id: 'doc-001', title: 'Dr.', firstName: 'Martín', lastName: 'Ferreyra', licenseNumber: 'MN 900101',
    specialtyIds: ['esp-001'], email: 'martin.ferreyra@centro-oncologico.demo', phone: '5491140000101',
    siteId: 'site-001', active: true, schedule: weekdays('08:00', '14:00', [1, 3, 5]), ...TS,
  },
  {
    id: 'doc-002', title: 'Dra.', firstName: 'Carolina', lastName: 'Ibarra', licenseNumber: 'MN 900102',
    specialtyIds: ['esp-002'], email: 'carolina.ibarra@centro-oncologico.demo', phone: '5491140000102',
    siteId: 'site-001', active: true, schedule: weekdays('09:00', '15:00', [1, 2, 4]), ...TS,
  },
  {
    id: 'doc-003', title: 'Dr.', firstName: 'Julián', lastName: 'Quiroga', licenseNumber: 'MN 900103',
    specialtyIds: ['esp-003'], email: 'julian.quiroga@centro-oncologico.demo', phone: '5491140000103',
    siteId: 'site-001', active: true, schedule: weekdays('07:00', '13:00', [1, 2, 3, 4, 5]), ...TS,
  },
  {
    id: 'doc-004', title: 'Dra.', firstName: 'Valeria', lastName: 'Montenegro', licenseNumber: 'MN 900104',
    specialtyIds: ['esp-004', 'esp-005'], email: 'valeria.montenegro@centro-oncologico.demo', phone: '5491140000104',
    siteId: 'site-002', active: true, schedule: weekdays('14:00', '19:00', [2, 4]), ...TS,
  },
  {
    id: 'doc-005', title: 'Dra.', firstName: 'Florencia', lastName: 'Aguirre', licenseNumber: 'MN 900105',
    specialtyIds: ['esp-005'], email: 'florencia.aguirre@centro-oncologico.demo', phone: '5491140000105',
    siteId: 'site-002', active: true, schedule: weekdays('10:00', '16:00', [1, 3]), ...TS,
  },
  {
    id: 'doc-006', title: 'Dr.', firstName: 'Nicolás', lastName: 'Bustos', licenseNumber: 'MN 900106',
    specialtyIds: ['esp-006'], email: 'nicolas.bustos@centro-oncologico.demo', phone: '5491140000106',
    siteId: 'site-003', active: true, schedule: weekdays('13:00', '18:00', [2, 3, 5]), ...TS,
  },
  {
    id: 'doc-007', title: 'Lic.', firstName: 'Paula', lastName: 'Rinaldi', licenseNumber: 'MN 900107',
    specialtyIds: ['esp-007'], email: 'paula.rinaldi@centro-oncologico.demo', phone: '5491140000107',
    siteId: 'site-002', active: true, schedule: weekdays('09:00', '13:00', [1, 2, 3, 4]), ...TS,
  },
  {
    id: 'doc-008', title: 'Dr.', firstName: 'Sebastián', lastName: 'Correa', licenseNumber: 'MN 900108',
    specialtyIds: ['esp-001', 'esp-002'], email: 'sebastian.correa@centro-oncologico.demo', phone: '5491140000108',
    siteId: 'site-003', active: false, schedule: weekdays('08:00', '12:00', [4, 5]), ...TS,
  },
];
