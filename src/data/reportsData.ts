/**
 * DATOS FICTICIOS — series históricas para el módulo de Reportes (Recharts).
 */

export interface MonthlyAppointmentMetric {
  month: string;
  atendidos: number;
  confirmados: number;
  cancelados: number;
  ausentes: number;
  tasaAusentismo: number;
}

export interface ChatbotIntentMetric {
  intent: string;
  resueltosBot: number;
  derivadosHumano: number;
}

export const monthlyAppointmentSeries: MonthlyAppointmentMetric[] = [
  { month: 'Jun', atendidos: 245, confirmados: 268, cancelados: 28, ausentes: 23, tasaAusentismo: 8.6 },
  { month: 'Jul', atendidos: 262, confirmados: 284, cancelados: 24, ausentes: 22, tasaAusentismo: 7.7 },
  { month: 'Ago', atendidos: 279, confirmados: 298, cancelados: 26, ausentes: 19, tasaAusentismo: 6.4 },
  { month: 'Sep', atendidos: 294, confirmados: 312, cancelados: 22, ausentes: 18, tasaAusentismo: 5.8 },
  { month: 'Oct', atendidos: 318, confirmados: 334, cancelados: 20, ausentes: 16, tasaAusentismo: 4.8 },
  { month: 'Nov', atendidos: 332, confirmados: 348, cancelados: 19, ausentes: 16, tasaAusentismo: 4.6 },
];

export const chatbotIntentSeries: ChatbotIntentMetric[] = [
  { intent: 'Solicitud de turno', resueltosBot: 164, derivadosHumano: 28 },
  { intent: 'Confirmación / Recordatorio', resueltosBot: 218, derivadosHumano: 9 },
  { intent: 'Recetas y órdenes', resueltosBot: 82, derivadosHumano: 46 },
  { intent: 'Horarios y sedes', resueltosBot: 135, derivadosHumano: 6 },
  { intent: 'Coberturas y autorizaciones', resueltosBot: 64, derivadosHumano: 37 },
];

export const chatbotResolutionSummary = [
  { name: 'Resuelto por asistente', value: 663, color: '#14B8A6' },
  { name: 'Derivado a recepción', value: 126, color: '#0F4C5C' },
];
