/** DATOS FICTICIOS — bloqueos horarios, vacaciones y ausencias de profesionales. */
import type { DoctorUnavailability } from '@/types';
import { addDays, toDateKey } from '@/utils/date';

const TODAY = new Date();
const TS = { createdAt: '2026-11-05T12:00:00.000Z', updatedAt: '2026-11-15T12:00:00.000Z' };

export const doctorBlocks: DoctorUnavailability[] = [
  {
    id: 'blk-001',
    doctorId: 'doc-001',
    type: 'bloqueo',
    startDate: toDateKey(addDays(TODAY, 1)),
    endDate: toDateKey(addDays(TODAY, 1)),
    allDay: false,
    startTime: '11:00',
    endTime: '12:30',
    reason: 'Ateneo clínico interdisciplinario',
    ...TS,
  },
  {
    id: 'blk-002',
    doctorId: 'doc-002',
    type: 'ausencia',
    startDate: toDateKey(addDays(TODAY, 2)),
    endDate: toDateKey(addDays(TODAY, 2)),
    allDay: true,
    reason: 'Congreso Argentino de Hematología (evento ficticio)',
    ...TS,
  },
  {
    id: 'blk-003',
    doctorId: 'doc-004',
    type: 'vacaciones',
    startDate: toDateKey(addDays(TODAY, 6)),
    endDate: toDateKey(addDays(TODAY, 12)),
    allDay: true,
    reason: 'Licencia anual ordinaria',
    ...TS,
  },
  {
    id: 'blk-004',
    doctorId: 'doc-005',
    type: 'bloqueo',
    startDate: toDateKey(TODAY),
    endDate: toDateKey(TODAY),
    allDay: false,
    startTime: '13:00',
    endTime: '14:00',
    reason: 'Reunión de comité de tumores',
    ...TS,
  },
];
