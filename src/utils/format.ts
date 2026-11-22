import { LOCALE, TIMEZONE } from '@/config/constants';

type DateInput = Date | string | number;

const toDate = (value: DateInput): Date => (value instanceof Date ? value : new Date(value));

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: TIMEZONE,
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TIMEZONE,
});

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIMEZONE,
});

/** 22/11/2026 */
export function formatDate(value: DateInput): string {
  return dateFormatter.format(toDate(value));
}

/** 14:30 */
export function formatTime(value: DateInput): string {
  return timeFormatter.format(toDate(value));
}

/** 22/11/2026 14:30 */
export function formatDateTime(value: DateInput): string {
  return `${formatDate(value)} ${formatTime(value)}`;
}

/** domingo, 22 de noviembre de 2026 */
export function formatLongDate(value: DateInput): string {
  const text = longDateFormatter.format(toDate(value));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Convierte "DD/MM/AAAA" en Date (o null si es inválida). */
export function parseDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return date.getDate() === Number(dd) && date.getMonth() === Number(mm) - 1 ? date : null;
}

/** Edad en años cumplidos. */
export function calculateAge(birthDate: DateInput, today: Date = new Date()): number {
  const birth = toDate(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** 30123456 → 30.123.456 */
export function formatDNI(value: string | number): string {
  const digits = String(value).replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formatea teléfonos móviles argentinos en formato internacional.
 * 5491140000101 → +54 9 11 4000-0101
 */
export function formatPhoneAR(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits.startsWith('549') || digits.length !== 13) return value;
  const rest = digits.slice(3);
  // CABA / GBA usa característica de 2 dígitos; para el resto se asumen 3 (simplificación demo).
  const areaLength = rest.startsWith('11') ? 2 : 3;
  const area = rest.slice(0, areaLength);
  const number = rest.slice(areaLength);
  return `+54 9 ${area} ${number.slice(0, -4)}-${number.slice(-4)}`;
}

/** "Martín Ferreyra" → "MF" */
export function getInitials(name: string): string {
  return name
    .replace(/^(Dr\.|Dra\.|Lic\.)\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const numberFormatter = new Intl.NumberFormat(LOCALE);

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
