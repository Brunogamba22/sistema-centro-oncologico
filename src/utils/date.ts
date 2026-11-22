/** Utilidades de calendario locales (sin desplazar fechas por UTC). */

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

/** Lunes de la semana correspondiente a `date`. */
export function startOfWeekMonday(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), diff);
}

/** Genera la grilla mensual (lunes a domingo) de 35 o 42 celdas. */
export function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = startOfWeekMonday(first);
  const last = new Date(year, month + 1, 0);
  const totalDays = Math.ceil((Math.round((last.getTime() - start.getTime()) / 86400000) + 1) / 7) * 7;
  return Array.from({ length: Math.max(35, totalDays) }, (_, i) => addDays(start, i));
}

/** Construye un ISO string con desplazamiento local a partir de YYYY-MM-DD y HH:mm. */
export function combineDateAndTime(dateKey: string, time: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

/** Suma minutos a una hora HH:mm -> HH:mm. */
export function addMinutesToTime(time: string, minutes: number): string {
  const [hh, mm] = time.split(':').map(Number);
  const total = hh * 60 + mm + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/** Genera slots horarios ["08:00", "08:20", ...] dentro de un rango. */
export function buildTimeSlots(startTime: string, endTime: string, slotMinutes: number): string[] {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  const slots: string[] = [];
  for (let t = startTotal; t + slotMinutes <= endTotal; t += slotMinutes) {
    slots.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  }
  return slots;
}
