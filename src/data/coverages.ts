/**
 * DATOS FICTICIOS — coberturas inventadas (obras sociales y prepagas).
 * Cualquier similitud con entidades reales es coincidencia.
 */
import type { Coverage } from '@/types';

export const coverages: Coverage[] = [
  { id: 'cov-001', name: 'OSDEF - Obra Social de Empleados Ficticios', type: 'obra_social', plans: ['General'] },
  { id: 'cov-002', name: 'OSPRA - Obra Social del Personal Demo', type: 'obra_social', plans: ['Básico', 'Superior'] },
  { id: 'cov-003', name: 'IOMA Demo', type: 'obra_social', plans: ['Único'] },
  { id: 'cov-004', name: 'Salud Integral Prepaga', type: 'prepaga', plans: ['SI 210', 'SI 310', 'SI 410'] },
  { id: 'cov-005', name: 'Vida Plena Medicina Privada', type: 'prepaga', plans: ['Plata', 'Oro', 'Platino'] },
  { id: 'cov-006', name: 'Medicus Demo', type: 'prepaga', plans: ['Azul', 'Celeste'] },
  { id: 'cov-007', name: 'Particular', type: 'particular', plans: [] },
];
