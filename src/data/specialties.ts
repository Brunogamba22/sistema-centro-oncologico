/** DATOS FICTICIOS — catálogo de especialidades del centro. */
import type { Specialty } from '@/types';

export const specialties: Specialty[] = [
  { id: 'esp-001', name: 'Oncología clínica', description: 'Diagnóstico, estadificación y tratamiento sistémico integral.', color: '#0F4C5C', defaultDurationMinutes: 30, active: true },
  { id: 'esp-002', name: 'Hematología', description: 'Diagnóstico y seguimiento de patologías hemato-oncológicas.', color: '#14B8A6', defaultDurationMinutes: 30, active: true },
  { id: 'esp-003', name: 'Radioterapia', description: 'Planificación dosimétrica y controles de sesiones de radioterapia.', color: '#3F8CA0', defaultDurationMinutes: 20, active: true },
  { id: 'esp-004', name: 'Cirugía oncológica', description: 'Evaluación prequirúrgica y seguimiento postoperatorio.', color: '#0D9488', defaultDurationMinutes: 30, active: true },
  { id: 'esp-005', name: 'Mastología', description: 'Prevención, diagnóstico y tratamiento de patología mamaria.', color: '#77B3C2', defaultDurationMinutes: 25, active: true },
  { id: 'esp-006', name: 'Cuidados paliativos', description: 'Control integral de síntomas, dolor y calidad de vida.', color: '#5CDCC4', defaultDurationMinutes: 40, active: true },
  { id: 'esp-007', name: 'Psicooncología', description: 'Acompañamiento psicológico para el paciente y su entorno familiar.', color: '#155E70', defaultDurationMinutes: 45, active: true },
  { id: 'esp-008', name: 'Nutrición oncológica', description: 'Asesoramiento nutricional adaptado a cada etapa del tratamiento.', color: '#2DD4BF', defaultDurationMinutes: 30, active: true },
];
