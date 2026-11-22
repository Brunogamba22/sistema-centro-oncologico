/** DATOS FICTICIOS — eventos de historial administrativo y de seguimiento del paciente. */
import type { PatientHistoryEvent } from '@/types';

export const patientHistory: PatientHistoryEvent[] = [
  {
    id: 'his-001',
    patientId: 'pat-001',
    date: '2026-11-15T16:00:00.000Z',
    category: 'tratamiento',
    title: 'Ciclo 3 completado sin incidencias',
    description: 'Se registró tolerancia adecuada y se emitió receta de soporte para el próximo control.',
    doctorId: 'doc-001',
  },
  {
    id: 'his-002',
    patientId: 'pat-001',
    date: '2026-11-12T14:25:00.000Z',
    category: 'estudio',
    title: 'Recepción de laboratorio previo a ciclo',
    description: 'Documentación cargada desde recepción y disponible para revisión médica.',
  },
  {
    id: 'his-003',
    patientId: 'pat-001',
    date: '2026-10-22T10:00:00.000Z',
    category: 'consulta',
    title: 'Consulta de control oncológico',
    description: 'Evaluación general y planificación de los siguientes ciclos de tratamiento.',
    doctorId: 'doc-001',
  },
  {
    id: 'his-004',
    patientId: 'pat-001',
    date: '2026-09-04T11:05:00.000Z',
    category: 'administrativo',
    title: 'Alta administrativa y validación de cobertura',
    description: 'Se verificó credencial Salud Integral Prepaga (Plan SI 310) y se firmó consentimiento.',
  },
  {
    id: 'his-005',
    patientId: 'pat-002',
    date: '2026-11-18T09:20:00.000Z',
    category: 'estudio',
    title: 'Envío de estudios por WhatsApp',
    description: 'El paciente adjuntó hemograma actualizado a través del asistente virtual.',
  },
  {
    id: 'his-006',
    patientId: 'pat-002',
    date: '2026-10-30T11:30:00.000Z',
    category: 'consulta',
    title: 'Control de Hematología',
    description: 'Seguimiento evolutivo y renovación de orden de laboratorio.',
    doctorId: 'doc-002',
  },
  {
    id: 'his-007',
    patientId: 'pat-005',
    date: '2026-11-10T10:40:00.000Z',
    category: 'administrativo',
    title: 'Autorización de obra social aprobada',
    description: 'OSPRA autorizó la cobertura del esquema terapéutico vigente.',
  },
];
