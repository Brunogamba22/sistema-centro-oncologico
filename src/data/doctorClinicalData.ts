/**
 * DATOS FICTICIOS — información clínica declarada, vistas previas de documentos
 * y notificaciones personales para el Panel Médico.
 * Nota: los medicamentos listados corresponden a medicación declarada por el paciente
 * y no constituyen prescripciones automáticas ni diagnósticos.
 */
import type { DeclaredMedication, DoctorNotification, DocumentPreviewContent } from '@/types';

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86400 * 1000).toISOString();

export const declaredMedications: DeclaredMedication[] = [
  {
    id: 'med-001',
    patientId: 'pat-001',
    name: 'Ondansetrón 8 mg comprimidos recubiertos',
    dose: '8 mg por toma',
    frequency: 'Cada 8 horas durante 3 días post-infusión',
    route: 'Vía oral',
    declaredAt: '2026-10-22T10:15:00.000Z',
    active: true,
    notes: 'Declarado por la paciente como soporte antiemético en ciclos previos.',
  },
  {
    id: 'med-002',
    patientId: 'pat-001',
    name: 'Dexametasona 4 mg comprimidos',
    dose: '4 mg por toma',
    frequency: 'Cada 12 horas los días 1 y 2 de ciclo',
    route: 'Vía oral',
    declaredAt: '2026-10-22T10:15:00.000Z',
    active: true,
    notes: 'Premedicación informada en esquema de hospital de día.',
  },
  {
    id: 'med-003',
    patientId: 'pat-005',
    name: 'Omeprazol 20 mg cápsulas',
    dose: '20 mg diarios',
    frequency: '1 vez por día en ayunas',
    route: 'Vía oral',
    declaredAt: '2026-11-01T09:00:00.000Z',
    active: true,
    notes: 'Protector gástrico declarado durante tratamiento ambulatorio.',
  },
  {
    id: 'med-004',
    patientId: 'pat-005',
    name: 'Paracetamol 500 mg comprimidos',
    dose: '500 mg según necesidad',
    frequency: 'Hasta cada 8 horas si refiere malestar general',
    route: 'Vía oral',
    declaredAt: '2026-10-15T11:30:00.000Z',
    active: true,
  },
  {
    id: 'med-005',
    patientId: 'pat-011',
    name: 'Levotiroxina sódica 75 mcg',
    dose: '75 mcg diarios',
    frequency: '1 vez por día en ayunas',
    route: 'Vía oral',
    declaredAt: '2026-08-15T10:00:00.000Z',
    active: true,
    notes: 'Medicación crónica habitual declarada en ficha.',
  },
  {
    id: 'med-006',
    patientId: 'pat-015',
    name: 'Calcio elemental 500 mg + Vitamina D3 400 UI',
    dose: '1 comprimido masticable',
    frequency: '2 veces por día con las comidas',
    route: 'Vía oral',
    declaredAt: '2026-09-29T14:00:00.000Z',
    active: true,
  },
  {
    id: 'med-007',
    patientId: 'pat-015',
    name: 'Enalapril 10 mg comprimidos',
    dose: '10 mg diarios',
    frequency: '1 vez por día por la mañana',
    route: 'Vía oral',
    declaredAt: '2026-09-10T10:00:00.000Z',
    active: true,
    notes: 'Antihipertensivo de base informado por la paciente.',
  },
  {
    id: 'med-008',
    patientId: 'pat-002',
    name: 'Ácido fólico 5 mg',
    dose: '5 mg diarios',
    frequency: '1 vez por día',
    route: 'Vía oral',
    declaredAt: '2026-10-05T11:00:00.000Z',
    active: true,
  },
];

export const documentPreviews: Record<string, DocumentPreviewContent> = {
  'docu-001': {
    documentId: 'docu-001',
    domain: 'clinico',
    issuer: 'Laboratorio Bioquímico Demo · CABA',
    documentCode: 'LAB-2026-1112-001',
    summary: 'Resultados de laboratorio de control previo a ciclo 4 (datos ficticios para revisión profesional).',
    sections: [
      {
        heading: 'Hemograma completo (valores simulados)',
        lines: [
          'Glóbulos blancos: 5.400 /mm³ (Neutrófilos 58%)',
          'Hemoglobina: 12,4 g/dL · Hematocrito: 37,2%',
          'Plaquetas: 235.000 /mm³',
        ],
      },
      {
        heading: 'Perfil hepático y renal (valores simulados)',
        lines: [
          'Creatinina sérica: 0,82 mg/dL · Urea: 29 mg/dL',
          'GOT (AST): 24 U/L · GPT (ALT): 27 U/L · Bilirrubina total: 0,7 mg/dL',
        ],
      },
    ],
  },
  'docu-002': {
    documentId: 'docu-002',
    domain: 'administrativo',
    issuer: 'Centro Oncológico Integral · Admisión',
    documentCode: 'ADM-CONS-2026-0904',
    summary: 'Consentimiento informado administrativo y de tratamiento firmado por la paciente al ingreso.',
    sections: [
      {
        heading: 'Constancia administrativa',
        lines: [
          'Documento firmado presencialmente en Sede Central CABA.',
          'Validación de identidad mediante DNI y cobertura Salud Integral Prepaga (Plan SI 310).',
        ],
      },
    ],
  },
  'docu-003': {
    documentId: 'docu-003',
    domain: 'clinico',
    issuer: 'Dr. Martín Ferreyra · MN 900101',
    documentCode: 'REC-2026-1115-003',
    summary: 'Copia archivada de receta de soporte emitida en consulta presencial anterior.',
    sections: [
      {
        heading: 'Detalle de archivo',
        lines: [
          'Emitida en consulta del 15/11/2026.',
          'Corresponde a medicación complementaria revisada por el profesional tratante.',
        ],
      },
    ],
  },
  'docu-006': {
    documentId: 'docu-006',
    domain: 'administrativo',
    issuer: 'OSPRA · Auditoría de Cobertura',
    documentCode: 'AUT-OSPRA-2026-1110',
    summary: 'Comprobante de autorización administrativa emitida por obra social para cobertura de sesiones.',
    sections: [
      {
        heading: 'Datos de autorización',
        lines: [
          'N° de trámite ficticio: OSP-884120-26',
          'Estado de cobertura: Autorizado · Vigencia 60 días corridos.',
        ],
      },
    ],
  },
  'docu-007': {
    documentId: 'docu-007',
    domain: 'clinico',
    issuer: 'Laboratorio Central Oeste (Demo)',
    documentCode: 'LAB-2026-1119-007',
    summary: 'Análisis bioquímico recibido por WhatsApp previo a sesión en hospital de día.',
    sections: [
      {
        heading: 'Parámetros informados (simulados)',
        lines: [
          'Hemograma: Serie blanca 4.900 /mm³ · Hemoglobina 11,9 g/dL · Plaquetas 210.000 /mm³',
          'Ionograma y función renal dentro de rangos de referencia del laboratorio.',
        ],
      },
    ],
  },
  'docu-008': {
    documentId: 'docu-008',
    domain: 'clinico',
    issuer: 'Dr. Martín Ferreyra · MN 900101',
    documentCode: 'INF-2026-1105-008',
    summary: 'Resumen de control semestral de seguimiento post-alta para archivo del paciente.',
    sections: [
      {
        heading: 'Resumen de seguimiento',
        lines: [
          'Control evolutivo realizado en Sede Central CABA.',
          'Se pautó próximo control programado en 6 meses con laboratorio de rutina.',
        ],
      },
    ],
  },
  'docu-009': {
    documentId: 'docu-009',
    domain: 'clinico',
    issuer: 'Centro de Diagnóstico por Imágenes Demo',
    documentCode: 'IMG-TC-2026-1116',
    summary: 'Informe descriptivo de tomografía de control comparativa adjuntado por la paciente.',
    sections: [
      {
        heading: 'Datos del estudio',
        lines: [
          'Modalidad: Tomografía computada con contraste oral y endovenoso (estudio ficticio).',
          'Adjuntado para evaluación presencial por el médico tratante.',
        ],
      },
    ],
  },
  'docu-010': {
    documentId: 'docu-010',
    domain: 'administrativo',
    issuer: 'Centro Oncológico Integral · Admisión',
    documentCode: 'ADM-CONS-2026-1012',
    summary: 'Consentimiento informado y declaración de cobertura firmada por la paciente.',
    sections: [
      {
        heading: 'Validación administrativa',
        lines: [
          'Cobertura verificada: VidaPlena Salud · Plan Platino.',
          'Archivado por Recepción Sede Central CABA.',
        ],
      },
    ],
  },
};

export const initialDoctorNotifications: DoctorNotification[] = [
  {
    id: 'dnot-001',
    doctorId: 'doc-001',
    category: 'receta',
    patientId: 'pat-001',
    title: 'Nueva solicitud de receta pendiente',
    message: 'Ana Laura Gómez solicitó renovación de Ondansetrón 8 mg (prioridad alta) por WhatsApp.',
    type: 'warning',
    read: false,
    createdAt: hoursAgo(2),
    link: '/medico/recetas',
  },
  {
    id: 'dnot-002',
    doctorId: 'doc-001',
    category: 'documento',
    patientId: 'pat-005',
    title: 'Documentación clínica recibida',
    message: 'Silvia Patricia Romero adjuntó "Laboratorio pre-sesión hospital de día.pdf" previo a su turno.',
    type: 'info',
    read: false,
    createdAt: hoursAgo(4),
    link: '/medico/documentacion',
  },
  {
    id: 'dnot-003',
    doctorId: 'doc-001',
    category: 'turno',
    patientId: 'pat-005',
    title: 'Paciente en sala de espera',
    message: 'Silvia Patricia Romero ya se anunció en recepción para su turno de las 09:40 hs.',
    type: 'alert',
    read: false,
    createdAt: hoursAgo(1),
    link: '/medico/agenda',
  },
  {
    id: 'dnot-004',
    doctorId: 'doc-001',
    category: 'solicitud',
    patientId: 'pat-015',
    title: 'Orden de estudio pendiente de revisión',
    message: 'Verónica Andrea Paz solicitó orden de laboratorio de control para presentar en su prepaga.',
    type: 'info',
    read: true,
    createdAt: hoursAgo(9),
    link: '/medico/pendientes',
  },
  {
    id: 'dnot-005',
    doctorId: 'doc-001',
    category: 'sistema',
    title: 'Recordatorio de ateneo clínico',
    message: 'Tenés un bloqueo horario mañana de 11:00 a 12:30 hs por Ateneo clínico interdisciplinario.',
    type: 'success',
    read: true,
    createdAt: daysAgo(1),
    link: '/medico/agenda',
  },
  {
    id: 'dnot-006',
    doctorId: 'doc-002',
    category: 'solicitud',
    patientId: 'pat-002',
    title: 'Solicitud asignada a Hematología',
    message: 'Carlos Alberto Méndez tiene una orden de laboratorio en revisión.',
    type: 'info',
    read: false,
    createdAt: hoursAgo(6),
    link: '/medico/pendientes',
  },
];
