import { BRAND } from '@/config/brand';

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const EMERGENCY_KEYWORDS = [
  'fiebre',
  '38',
  '39',
  '40 grados',
  'falta de aire',
  'disnea',
  'no puedo respirar',
  'me ahogo',
  'dolor de pecho',
  'dolor en el pecho',
  'opresion en el pecho',
  'sangrado',
  'hemorragia',
  'desmayo',
  'convulsion',
  'urgencia',
  'emergencia',
  'guardia',
  'vomitos persistentes',
  'reaccion alergica',
];

const CLINICAL_ADVICE_KEYWORDS = [
  'diagnostic',
  'tengo cancer',
  'es cancer',
  'es maligno',
  'que medicamento tomo',
  'que puedo tomar',
  'que me recomendas',
  'puedo cambiar la dosis',
  'subir la dosis',
  'bajar la dosis',
  'suspender la quimio',
  'suspender el tratamiento',
  'que tratamiento me conviene',
  'recetame',
  'prescribi',
  'interpretar estudio',
  'que significa mi biopsia',
  'que significa el resultado',
];

export function isEmergencyMessage(rawText: string): boolean {
  const text = normalizeText(rawText);
  return EMERGENCY_KEYWORDS.some((kw) => text.includes(kw));
}

export function isClinicalAdviceRequest(rawText: string): boolean {
  const text = normalizeText(rawText);
  return CLINICAL_ADVICE_KEYWORDS.some((kw) => text.includes(kw));
}

export function buildEmergencyProtocolMessage(): string {
  return [
    '🚨 *PROTOCOLO INSTITUCIONAL DE URGENCIAS*',
    '',
    'Este asistente virtual es únicamente administrativo y **no atiende urgencias médicas**.',
    '',
    'Si presentás fiebre ≥ 38 °C, dificultad para respirar, dolor de pecho, sangrado o síntomas de alarma:',
    '• Llamá de inmediato al **107 (SAME)** o al servicio de emergencias de tu cobertura.',
    '• Acudí a la **guardia oncológica u hospitalaria más cercana**.',
    `• Línea institucional de orientación (demo): **${BRAND.contact.phone}**.`,
    '',
    'Si necesitás asistencia administrativa prioritaria, podés derivar esta conversación ahora mismo a Recepción.',
  ].join('\n');
}

export function buildClinicalScopeDisclaimer(): string {
  return [
    'ℹ️ *Aviso de alcance del asistente*',
    '',
    'Soy el asistente virtual administrativo del ' + BRAND.name + '.',
    'Por seguridad del paciente, **no realizo diagnósticos, no interpreto estudios, no recomiendo ni modifico tratamientos y no prescribo medicamentos**.',
    '',
    'Cualquier indicación clínica debe ser evaluada por tu profesional tratante. ¿Querés que gestionemos un turno de control, registremos una solicitud de receta para revisión médica o te derivemos con Recepción?',
  ].join('\n');
}
