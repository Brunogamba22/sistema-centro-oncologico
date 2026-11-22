/** DATOS FICTICIOS — catálogo de especialidades del centro. */
import type { Specialty } from '@/types';

export const specialties: Specialty[] = [
  { id: 'esp-001', name: 'Oncología clínica', description: 'Diagnóstico y tratamiento sistémico.', color: '#0F4C5C', active: true },
  { id: 'esp-002', name: 'Hematología', description: 'Enfermedades de la sangre.', color: '#14B8A6', active: true },
  { id: 'esp-003', name: 'Radioterapia', description: 'Planificación y sesiones de radioterapia.', color: '#3F8CA0', active: true },
  { id: 'esp-004', name: 'Cirugía oncológica', description: 'Evaluación y seguimiento quirúrgico.', color: '#0D9488', active: true },
  { id: 'esp-005', name: 'Mastología', description: 'Patología mamaria.', color: '#77B3C2', active: true },
  { id: 'esp-006', name: 'Cuidados paliativos', description: 'Control de síntomas y calidad de vida.', color: '#5CDCC4', active: true },
  { id: 'esp-007', name: 'Psicooncología', description: 'Acompañamiento psicológico.', color: '#155E70', active: true },
  { id: 'esp-008', name: 'Nutrición oncológica', description: 'Asesoramiento nutricional.', color: '#2DD4BF', active: true },
];
