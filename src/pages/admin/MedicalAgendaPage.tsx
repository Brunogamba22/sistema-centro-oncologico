import { useMemo, useState } from 'react';
import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, CardContent, CardHeader, EmptyState, PageLoader, Select } from '@/components/ui';
import {
  APPOINTMENT_STATUS_META,
  DAY_OF_WEEK_LABELS,
  DAY_OF_WEEK_SHORT,
  UNAVAILABILITY_META,
} from '@/config/status';
import { useToast } from '@/context/toast/useToast';
import { BlockFormModal } from '@/features/agenda/BlockFormModal';
import { AppointmentFormModal } from '@/features/appointments/AppointmentFormModal';
import { useAsync } from '@/hooks/useAsync';
import { agendaService, appointmentsService, catalogService, doctorsService, patientsService } from '@/services';
import type { BlockPayload } from '@/services/agendaService';
import type { Appointment, DoctorUnavailability } from '@/types';
import { cn } from '@/utils/cn';
import { addDays, buildTimeSlots, getMonthGrid, isSameDay, startOfWeekMonday, toDateKey } from '@/utils/date';
import { formatDate, formatTime } from '@/utils/format';

type AgendaView = 'day' | 'week' | 'month';
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function blockCoversDate(block: DoctorUnavailability, dateKey: string): boolean {
  return dateKey >= block.startDate && dateKey <= block.endDate;
}

export default function MedicalAgendaPage() {
  const { toast } = useToast();
  const { data, loading, reload } = useAsync(async () => {
    const [doctors, specialties, appointments, patients, blocks] = await Promise.all([
      doctorsService.list(),
      catalogService.listSpecialties(),
      appointmentsService.list(),
      patientsService.list(),
      agendaService.listBlocks(),
    ]);
    return { doctors, specialties, appointments, patients, blocks };
  }, []);

  const [view, setView] = useState<AgendaView>('week');
  const [selectedDoctorId, setSelectedDoctorId] = useState('doc-001');
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [aptModalOpen, setAptModalOpen] = useState(false);

  const selectedDoctor = useMemo(
    () => data?.doctors.find((d) => d.id === selectedDoctorId) ?? data?.doctors[0],
    [data?.doctors, selectedDoctorId],
  );

  const patientMap = useMemo(() => new Map(data?.patients.map((p) => [p.id, p]) ?? []), [data?.patients]);
  const specialtyMap = useMemo(() => new Map(data?.specialties.map((s) => [s.id, s]) ?? []), [data?.specialties]);

  const doctorAppointments = useMemo(() => {
    if (!data || !selectedDoctor) return [];
    return data.appointments.filter((a) => a.doctorId === selectedDoctor.id && a.status !== 'cancelado');
  }, [data, selectedDoctor]);

  const doctorBlocks = useMemo(() => {
    if (!data || !selectedDoctor) return [];
    return data.blocks.filter((b) => b.doctorId === selectedDoctor.id);
  }, [data, selectedDoctor]);

  const navigateCursor = (direction: -1 | 1) => {
    if (view === 'day') setCursorDate((d) => addDays(d, direction));
    else if (view === 'week') setCursorDate((d) => addDays(d, direction * 7));
    else setCursorDate((d) => new Date(d.getFullYear(), d.getMonth() + direction, 1));
  };

  const handleCreateBlock = async (payload: BlockPayload) => {
    await agendaService.createBlock(payload);
    toast({ title: 'Registro guardado', description: 'Se actualizó la disponibilidad de la agenda.', variant: 'success' });
    await reload();
  };

  const handleDeleteBlock = async (id: string) => {
    await agendaService.deleteBlock(id);
    toast({ title: 'Bloqueo eliminado', description: 'La franja volvió a quedar disponible.', variant: 'info' });
    await reload();
  };

  const handleCreateAppointment = async (
    result: Parameters<React.ComponentProps<typeof AppointmentFormModal>['onSubmit']>[0],
  ) => {
    if (result.mode === 'create' && result.payload) {
      await appointmentsService.create(result.payload);
      toast({ title: 'Turno agendado', description: 'El turno fue agregado a la agenda del profesional.', variant: 'success' });
      await reload();
    }
  };

  if (loading || !data || !selectedDoctor) return <PageLoader />;

  const cursorKey = toDateKey(cursorDate);
  const weekStart = startOfWeekMonday(cursorDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthGrid = getMonthGrid(cursorDate.getFullYear(), cursorDate.getMonth());

  const dayOfWeek = cursorDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const daySchedule = selectedDoctor.schedule.find((s) => s.dayOfWeek === dayOfWeek);
  const dayBlocks = doctorBlocks.filter((b) => blockCoversDate(b, cursorKey));
  const fullDayBlocked = dayBlocks.some((b) => b.allDay);
  const dayAppointments = doctorAppointments
    .filter((a) => toDateKey(new Date(a.startAt)) === cursorKey)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const daySlots = daySchedule ? buildTimeSlots(daySchedule.startTime, daySchedule.endTime, daySchedule.slotMinutes) : [];
  const appointmentBySlot = new Map<string, Appointment>();
  dayAppointments.forEach((a) => appointmentBySlot.set(formatTime(a.startAt), a));

  const periodTitle =
    view === 'day'
      ? `${DAY_OF_WEEK_LABELS[dayOfWeek]} ${formatDate(cursorDate)}`
      : view === 'week'
        ? `Semana del ${formatDate(weekDays[0])} al ${formatDate(weekDays[6])}`
        : cursorDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda médica"
        description="Disponibilidad por profesional, horarios laborales, bloqueos, vacaciones y ausencias."
        actions={
          <>
            <Button variant="outline" size="sm" leftIcon={<CalendarOff className="h-4 w-4" />} onClick={() => setBlockModalOpen(true)}>
              Bloqueo / Ausencia
            </Button>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAptModalOpen(true)}>
              Agendar turno
            </Button>
          </>
        }
      />

      {/* Barra de control */}
      <Card>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              aria-label="Seleccionar profesional"
              containerClassName="w-full sm:w-72"
              value={selectedDoctor.id}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              options={data.doctors.map((d) => ({
                value: d.id,
                label: `${d.title} ${d.firstName} ${d.lastName}${d.active ? '' : ' (Inactivo)'}`,
              }))}
            />
            <div className="flex flex-wrap gap-1.5">
              {selectedDoctor.specialtyIds.map((id) => (
                <Badge key={id} variant="primary">
                  {specialtyMap.get(id)?.name}
                </Badge>
              ))}
              <Badge variant="neutral">{selectedDoctor.licenseNumber}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
            <div className="inline-flex rounded-lg border border-line bg-surface p-1">
              {(
                [
                  { id: 'day', label: 'Diaria' },
                  { id: 'week', label: 'Semanal' },
                  { id: 'month', label: 'Mensual' },
                ] as { id: AgendaView; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setView(tab.id)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition',
                    view === tab.id ? 'bg-primary-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => navigateCursor(-1)} aria-label="Período anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCursorDate(new Date())}>
                Hoy
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateCursor(1)} aria-label="Período siguiente">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-12">
        {/* Calendario principal */}
        <Card className="xl:col-span-8">
          <CardHeader
            title={periodTitle}
            description={
              selectedDoctor.active
                ? `Duración estándar de consulta: ${selectedDoctor.schedule[0]?.slotMinutes ?? 20} min`
                : 'Profesional actualmente inactivo'
            }
          />

          {view === 'day' && (
            <CardContent className="space-y-4">
              {dayBlocks.length > 0 && (
                <div className="space-y-2">
                  {dayBlocks.map((b) => (
                    <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
                      <div>
                        <strong className="font-semibold">{UNAVAILABILITY_META[b.type].label}:</strong> {b.reason}
                        <span className="ml-2 text-amber-700">
                          {b.allDay ? '(Jornada completa)' : `(${b.startTime} - ${b.endTime} hs)`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!daySchedule || fullDayBlocked ? (
                <EmptyState
                  icon={CalendarOff}
                  title={fullDayBlocked ? 'Jornada bloqueada' : 'Sin atención programada'}
                  description={
                    fullDayBlocked
                      ? 'El profesional registra una ausencia o vacaciones para esta fecha.'
                      : `${selectedDoctor.title} ${selectedDoctor.lastName} no atiende los días ${DAY_OF_WEEK_LABELS[dayOfWeek].toLowerCase()}.`
                  }
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {daySlots.map((slot) => {
                    const apt = appointmentBySlot.get(slot);
                    const blockedSlot = dayBlocks.some(
                      (b) => !b.allDay && b.startTime && b.endTime && slot >= b.startTime && slot < b.endTime,
                    );
                    const patient = apt ? patientMap.get(apt.patientId) : undefined;

                    return (
                      <div
                        key={slot}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-sm',
                          blockedSlot
                            ? 'border-amber-200 bg-amber-50/70 text-amber-800'
                            : apt
                              ? 'border-primary-200 bg-primary-50/50'
                              : 'border-line bg-white',
                        )}
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-primary-700">{slot} hs</span>
                          <p className="truncate font-medium text-slate-900">
                            {blockedSlot
                              ? 'Franja bloqueada'
                              : apt
                                ? `${patient?.lastName ?? 'Paciente'}, ${patient?.firstName ?? ''}`
                                : 'Disponible'}
                          </p>
                        </div>
                        {blockedSlot ? (
                          <Badge variant="warning">Bloqueo</Badge>
                        ) : apt ? (
                          <Badge variant={APPOINTMENT_STATUS_META[apt.status].variant} dot>
                            {APPOINTMENT_STATUS_META[apt.status].label}
                          </Badge>
                        ) : (
                          <Badge variant="success">Libre</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          )}

          {view === 'week' && (
            <CardContent className="p-3 sm:p-5">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
                {weekDays.map((date) => {
                  const key = toDateKey(date);
                  const dow = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
                  const sched = selectedDoctor.schedule.find((s) => s.dayOfWeek === dow);
                  const blocks = doctorBlocks.filter((b) => blockCoversDate(b, key));
                  const items = doctorAppointments
                    .filter((a) => toDateKey(new Date(a.startAt)) === key)
                    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
                  const isToday = isSameDay(date, new Date());

                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex min-h-[210px] flex-col rounded-xl border p-2.5',
                        isToday ? 'border-primary-400 bg-primary-50/30' : 'border-line bg-white',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCursorDate(date);
                          setView('day');
                        }}
                        className="mb-2 flex items-center justify-between border-b border-line pb-1.5 text-left"
                      >
                        <span className="text-xs font-semibold text-slate-500">{DAY_OF_WEEK_SHORT[dow]}</span>
                        <span
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                            isToday ? 'bg-primary-700 text-white' : 'text-slate-800',
                          )}
                        >
                          {date.getDate()}
                        </span>
                      </button>

                      {sched ? (
                        <p className="mb-2 text-[11px] text-slate-500">
                          {sched.startTime}–{sched.endTime} hs
                        </p>
                      ) : (
                        <p className="mb-2 text-[11px] text-slate-400">Sin atención</p>
                      )}

                      <div className="space-y-1.5">
                        {blocks.map((b) => (
                          <div key={b.id} className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                            {UNAVAILABILITY_META[b.type].label}
                          </div>
                        ))}
                        {items.map((apt) => {
                          const p = patientMap.get(apt.patientId);
                          return (
                            <div key={apt.id} className="rounded-md bg-primary-50 px-2 py-1 text-[11px] text-primary-900">
                              <span className="font-semibold">{formatTime(apt.startAt)}</span>{' '}
                              <span className="truncate">{p?.lastName ?? 'Paciente'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}

          {view === 'month' && (
            <CardContent className="overflow-x-auto p-3 sm:p-5">
              <div className="min-w-[520px]">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-1.5">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthGrid.map((date) => {
                  const key = toDateKey(date);
                  const inMonth = date.getMonth() === cursorDate.getMonth();
                  const dow = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
                  const works = selectedDoctor.schedule.some((s) => s.dayOfWeek === dow);
                  const blocks = doctorBlocks.filter((b) => blockCoversDate(b, key));
                  const count = doctorAppointments.filter((a) => toDateKey(new Date(a.startAt)) === key).length;
                  const isToday = isSameDay(date, new Date());

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setCursorDate(date);
                        setView('day');
                      }}
                      className={cn(
                        'flex min-h-[76px] flex-col rounded-lg border p-1.5 text-left transition hover:bg-surface',
                        isToday ? 'border-primary-500 bg-primary-50/40' : 'border-line bg-white',
                        !inMonth && 'opacity-40',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">{date.getDate()}</span>
                        {works && <span className="h-1.5 w-1.5 rounded-full bg-accent-500" title="Día laboral" />}
                      </div>
                      <div className="mt-auto space-y-0.5">
                        {blocks.length > 0 && (
                          <span className="block truncate rounded bg-amber-50 px-1 text-[10px] font-medium text-amber-800">
                            {UNAVAILABILITY_META[blocks[0].type].label}
                          </span>
                        )}
                        {count > 0 && (
                          <span className="block truncate rounded bg-primary-50 px-1 text-[10px] font-medium text-primary-700">
                            {count} turno{count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Panel derecho: Horarios laborales + Bloqueos/Vacaciones/Ausencias */}
        <div className="space-y-6 xl:col-span-4">
          <Card>
            <CardHeader
              title="Horarios laborales"
              description="Configuración semanal del profesional seleccionado"
            />
            <CardContent className="space-y-2.5">
              {selectedDoctor.schedule.length === 0 ? (
                <p className="text-sm text-slate-500">Sin horarios configurados.</p>
              ) : (
                selectedDoctor.schedule.map((slot) => (
                  <div key={slot.dayOfWeek} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-800">
                      <Clock className="h-4 w-4 text-primary-600" />
                      {DAY_OF_WEEK_LABELS[slot.dayOfWeek]}
                    </span>
                    <span className="text-xs text-slate-600">
                      {slot.startTime} a {slot.endTime} hs · {slot.slotMinutes} min
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Bloqueos, vacaciones y ausencias"
              description={`${doctorBlocks.length} registro(s) para ${selectedDoctor.title} ${selectedDoctor.lastName}`}
            />
            {doctorBlocks.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="Agenda sin bloqueos"
                description="No hay ausencias ni vacaciones registradas para este profesional."
              />
            ) : (
              <ul className="divide-y divide-line">
                {doctorBlocks.map((b) => (
                  <li key={b.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <Badge variant={UNAVAILABILITY_META[b.type].variant}>{UNAVAILABILITY_META[b.type].label}</Badge>
                      <p className="mt-1.5 text-sm font-medium text-slate-900">{b.reason}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(`${b.startDate}T12:00:00`)}
                        {b.endDate !== b.startDate ? ` al ${formatDate(`${b.endDate}T12:00:00`)}` : ''}
                        {' · '}
                        {b.allDay ? 'Jornada completa' : `${b.startTime} a ${b.endTime} hs`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(b.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      title="Eliminar registro"
                      aria-label="Eliminar bloqueo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <BlockFormModal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        doctors={data.doctors}
        defaultDoctorId={selectedDoctor.id}
        defaultDateKey={cursorKey}
        onSubmit={handleCreateBlock}
      />

      <AppointmentFormModal
        open={aptModalOpen}
        onClose={() => setAptModalOpen(false)}
        defaultDoctorId={selectedDoctor.id}
        defaultDateKey={cursorKey}
        patients={data.patients}
        doctors={data.doctors}
        specialties={data.specialties}
        onSubmit={handleCreateAppointment}
      />
    </div>
  );
}
