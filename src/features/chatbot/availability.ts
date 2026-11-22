import { DAY_OF_WEEK_SHORT } from '@/config/status';
import type { Appointment, Doctor, DoctorUnavailability } from '@/types';
import { addDays, buildTimeSlots, toDateKey } from '@/utils/date';
import { formatDate, formatTime } from '@/utils/format';

export interface AvailableDateOption {
  dateKey: string;
  label: string;
  slots: string[];
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function isBlockedSlot(
  dateKey: string,
  slot: string,
  slotMinutes: number,
  blocks: DoctorUnavailability[],
): boolean {
  const slotStart = toMinutes(slot);
  const slotEnd = slotStart + slotMinutes;

  return blocks.some((block) => {
    if (dateKey < block.startDate || dateKey > block.endDate) return false;
    if (block.allDay) return true;
    if (!block.startTime || !block.endTime) return false;
    const blockStart = toMinutes(block.startTime);
    const blockEnd = toMinutes(block.endTime);
    return slotStart < blockEnd && slotEnd > blockStart;
  });
}

/**
 * Calcula los próximos días y horarios realmente disponibles para un profesional
 * considerando su agenda semanal, bloqueos/ausencias y turnos ya reservados.
 */
export function getDoctorAvailableDates(
  doctor: Doctor,
  appointments: Appointment[],
  blocks: DoctorUnavailability[],
  maxDaysAhead = 14,
  maxDates = 5,
): AvailableDateOption[] {
  const doctorBlocks = blocks.filter((b) => b.doctorId === doctor.id);
  const doctorAppointments = appointments.filter(
    (a) => a.doctorId === doctor.id && a.status !== 'cancelado',
  );

  const today = new Date();
  const options: AvailableDateOption[] = [];

  for (let offset = 1; offset <= maxDaysAhead && options.length < maxDates; offset++) {
    const date = addDays(today, offset);
    const dateKey = toDateKey(date);
    const dow = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

    const daySchedules = doctor.schedule.filter((s) => s.dayOfWeek === dow);
    if (daySchedules.length === 0) continue;

    const occupiedTimes = new Set(
      doctorAppointments
        .filter((a) => toDateKey(new Date(a.startAt)) === dateKey)
        .map((a) => formatTime(a.startAt)),
    );

    const freeSlots: string[] = [];
    for (const sched of daySchedules) {
      const slots = buildTimeSlots(sched.startTime, sched.endTime, sched.slotMinutes);
      for (const slot of slots) {
        if (occupiedTimes.has(slot)) continue;
        if (isBlockedSlot(dateKey, slot, sched.slotMinutes, doctorBlocks)) continue;
        freeSlots.push(slot);
      }
    }

    if (freeSlots.length > 0) {
      options.push({
        dateKey,
        label: `${DAY_OF_WEEK_SHORT[dow]} ${formatDate(date).slice(0, 5)}`,
        slots: freeSlots,
      });
    }
  }

  return options;
}
