import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar, Badge, Button, Card, CardContent, CardHeader, EmptyState, PageLoader, Select } from '@/components/ui';
import {
  APPOINTMENT_STATUS_META,
  APPOINTMENT_TYPE_LABELS,
  DAY_OF_WEEK_SHORT,
  UNAVAILABILITY_META,
} from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { DoctorAppointmentDrawer } from '@/features/doctor/DoctorAppointmentDrawer';
import { useAsync } from '@/hooks/useAsync';
import {
  agendaService,
  appointmentsService,
  catalogService,
  doctorPortalService,
  doctorsService,
  patientsService,
} from '@/services';
import type { Appointment, AppointmentStatus } from '@/types';
import { cn } from '@/utils/cn';
import { addDays, getMonthGrid, isSameDay, startOfWeekMonday, toDateKey } from '@/utils/date';
import { formatDate, formatDNI, formatLongDate, formatTime } from '@/utils/format';

type CalendarView = 'day' | 'week' | 'month';

const MONTH_FORMATTER = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function DoctorAgendaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const doctorId = user?.doctorId;

  const [view, setView] = useState<CalendarView>('week');
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const { data, loading, reload } = useAsync(async () => {
    const [doctor, allPatients, allAppointments, allBlocks, coverages, specialties] = await Promise.all([
      doctorId ? doctorsService.getById(doctorId) : Promise.resolve(undefined),
      patientsService.list(),
      appointmentsService.list(),
      agendaService.listBlocks(),
      catalogService.listCoverages(),
      catalogService.listSpecialties(),
    ]);

    const myPatients = doctorPortalService.filterAuthorizedPatients(allPatients, doctorId);

    return {
      doctor,
      allPatients,
      myPatients,
      myAppointments: allAppointments
        .filter((a) => a.doctorId === doctorId)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
      myBlocks: allBlocks.filter((b) => b.doctorId === doctorId),
      coverages,
      specialties,
    };
  }, [doctorId]);

  const today = useMemo(() => new Date(), []);

  const derived = useMemo(() => {
    if (!data) return null;
    const patientsById = new Map(data.allPatients.map((p) => [p.id, p]));
    const coveragesById = new Map(data.coverages.map((c) => [c.id, c]));
    const specialtiesById = new Map(data.specialties.map((s) => [s.id, s]));

    const filteredAppointments =
      statusFilter === 'all'
        ? data.myAppointments
        : data.myAppointments.filter((a) => a.status === statusFilter);

    const byDateKey = new Map<string, Appointment[]>();
    for (const apt of filteredAppointments) {
      const key = toDateKey(new Date(apt.startAt));
      const existing = byDateKey.get(key) ?? [];
      existing.push(apt);
      byDateKey.set(key, existing);
    }

    return { patientsById, coveragesById, specialtiesById, filteredAppointments, byDateKey };
  }, [data, statusFilter]);

  const navigatePeriod = (delta: number) => {
    if (view === 'day') {
      setCursor((d) => addDays(d, delta));
    } else if (view === 'week') {
      setCursor((d) => addDays(d, delta * 7));
    } else {
      setCursor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
    }
  };

  const handleUpdateStatus = async (id: string, status: AppointmentStatus, notes?: string) => {
    await appointmentsService.updateStatus(id, status, notes);
    toast({
      title: 'Agenda actualizada',
      description: `Turno actualizado a "${APPOINTMENT_STATUS_META[status].label}".`,
      variant: 'success',
    });
    await reload();
  };

  if (loading || !data || !derived) {
    return <PageLoader />;
  }

  const weekStart = startOfWeekMonday(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthDays = getMonthGrid(cursor.getFullYear(), cursor.getMonth());

  const periodLabel =
    view === 'day'
      ? formatLongDate(cursor)
      : view === 'week'
        ? `Semana del ${weekDays[0].toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} al ${weekDays[6].toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}`
        : MONTH_FORMATTER.format(cursor).replace(/^\w/, (c) => c.toUpperCase());

  const blocksForDateKey = (dateKey: string) =>
    data.myBlocks.filter((b) => dateKey >= b.startDate && dateKey <= b.endDate);

  const selectedDayKey = toDateKey(cursor);
  const selectedDayAppointments = derived.byDateKey.get(selectedDayKey) ?? [];
  const selectedDayBlocks = blocksForDateKey(selectedDayKey);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi agenda"
        description="Calendario diario, semanal y mensual con tus turnos asignados, estados y bloqueos personales."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
              {(
                [
                  { id: 'day', label: 'Día' },
                  { id: 'week', label: 'Semana' },
                  { id: 'month', label: 'Mes' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setView(mode.id)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition',
                    view === mode.id
                      ? 'bg-primary-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Barra de navegación de fecha y filtro */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePeriod(-1)}
              aria-label="Período anterior"
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePeriod(1)}
              aria-label="Período siguiente"
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Siguiente
            </Button>
            <span className="ml-2 text-sm font-semibold text-slate-900">{periodLabel}</span>
          </div>

          <div className="w-full sm:w-52">
            <Select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todos los estados' },
                ...(Object.keys(APPOINTMENT_STATUS_META) as AppointmentStatus[]).map((k) => ({
                  value: k,
                  label: APPOINTMENT_STATUS_META[k].label,
                })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* VISTA DIARIA */}
      {view === 'day' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader
              title={`Turnos del día (${selectedDayAppointments.length})`}
              description={formatLongDate(cursor)}
            />
            <CardContent className="p-0">
              {selectedDayBlocks.length > 0 && (
                <div className="border-b border-amber-100 bg-amber-50/70 px-5 py-3">
                  {selectedDayBlocks.map((blk) => (
                    <div key={blk.id} className="flex items-center gap-2 text-xs text-amber-900">
                      <CalendarX2 className="h-4 w-4 shrink-0 text-amber-600" />
                      <span className="font-semibold">{UNAVAILABILITY_META[blk.type].label}:</span>
                      <span>
                        {blk.allDay ? 'Todo el día' : `${blk.startTime} a ${blk.endTime} hs`} · {blk.reason}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {selectedDayAppointments.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Sin turnos para esta fecha"
                  description="No registrás turnos con el filtro seleccionado para este día."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {selectedDayAppointments.map((apt) => {
                    const patient = derived.patientsById.get(apt.patientId);
                    const coverage = patient ? derived.coveragesById.get(patient.coverage.coverageId) : undefined;
                    const statusMeta = APPOINTMENT_STATUS_META[apt.status];
                    return (
                      <li
                        key={apt.id}
                        onClick={() => setSelectedAppointment(apt)}
                        className="flex cursor-pointer flex-col gap-3 px-5 py-4 transition hover:bg-surface/70 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <div className="w-16 shrink-0 rounded-lg bg-primary-50 px-2.5 py-2 text-center">
                            <p className="text-sm font-semibold text-primary-800">{formatTime(apt.startAt)}</p>
                            <p className="text-[11px] text-primary-600">{formatTime(apt.endAt)}</p>
                          </div>
                          <Avatar
                            name={patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {patient ? `DNI ${formatDNI(patient.dni)}` : ''}
                              {coverage ? ` · ${coverage.name}` : ''}
                            </p>
                            {apt.notes && <p className="mt-0.5 truncate text-xs text-slate-600">{apt.notes}</p>}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="neutral">{APPOINTMENT_TYPE_LABELS[apt.type]}</Badge>
                          <Badge variant={statusMeta.variant} dot>
                            {statusMeta.label}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader title="Tu esquema semanal" description="Días y franjas habituales de atención" />
            <CardContent className="space-y-3">
              {data.doctor?.schedule.map((slot) => (
                <div
                  key={slot.dayOfWeek}
                  className="flex items-center justify-between rounded-lg border border-line bg-surface px-3.5 py-2.5 text-xs"
                >
                  <span className="font-semibold text-slate-800">{DAY_OF_WEEK_SHORT[slot.dayOfWeek]}</span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-primary-600" />
                    {slot.startTime} a {slot.endTime} hs ({slot.slotMinutes} min)
                  </span>
                </div>
              ))}
              {data.myBlocks.length > 0 && (
                <div className="pt-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Bloqueos programados
                  </p>
                  <div className="space-y-2">
                    {data.myBlocks.map((blk) => (
                      <div key={blk.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs">
                        <p className="font-semibold text-amber-900">{blk.reason}</p>
                        <p className="mt-0.5 text-amber-800">
                          {formatDate(blk.startDate)}
                          {blk.endDate !== blk.startDate ? ` al ${formatDate(blk.endDate)}` : ''} ·{' '}
                          {blk.allDay ? 'Día completo' : `${blk.startTime} - ${blk.endTime} hs`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VISTA SEMANAL */}
      {view === 'week' && (
        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((day) => {
            const key = toDateKey(day);
            const dayApts = derived.byDateKey.get(key) ?? [];
            const dayBlocks = blocksForDateKey(key);
            const isToday = isSameDay(day, today);
            return (
              <Card
                key={key}
                className={cn('flex min-h-[260px] flex-col', isToday && 'border-primary-400 ring-1 ring-primary-200')}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCursor(day);
                    setView('day');
                  }}
                  className={cn(
                    'flex items-center justify-between border-b border-line px-3 py-2.5 text-left transition hover:bg-surface',
                    isToday && 'bg-primary-50/70',
                  )}
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {DAY_OF_WEEK_SHORT[day.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6]}
                    </p>
                    <p className={cn('text-sm font-semibold', isToday ? 'text-primary-800' : 'text-slate-900')}>
                      {day.getDate()}
                    </p>
                  </div>
                  {dayApts.length > 0 && (
                    <Badge variant={isToday ? 'primary' : 'neutral'}>{dayApts.length}</Badge>
                  )}
                </button>

                <div className="flex-1 space-y-2 p-2.5">
                  {dayBlocks.map((blk) => (
                    <div key={blk.id} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
                      <p className="font-semibold">{UNAVAILABILITY_META[blk.type].label}</p>
                      <p className="truncate">{blk.reason}</p>
                    </div>
                  ))}

                  {dayApts.length === 0 && dayBlocks.length === 0 ? (
                    <p className="py-6 text-center text-[11px] text-slate-400">Sin turnos</p>
                  ) : (
                    dayApts.map((apt) => {
                      const patient = derived.patientsById.get(apt.patientId);
                      const statusMeta = APPOINTMENT_STATUS_META[apt.status];
                      return (
                        <button
                          key={apt.id}
                          type="button"
                          onClick={() => setSelectedAppointment(apt)}
                          className="w-full rounded-lg border border-line bg-white p-2 text-left shadow-sm transition hover:border-primary-300 hover:bg-primary-50/30"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-primary-800">{formatTime(apt.startAt)}</span>
                            <Badge variant={statusMeta.variant} className="px-1.5 py-0 text-[10px]">
                              {statusMeta.label}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate text-xs font-medium text-slate-900">
                            {patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">{APPOINTMENT_TYPE_LABELS[apt.type]}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* VISTA MENSUAL */}
      {view === 'month' && (
        <Card className="overflow-x-auto">
          <div className="min-w-[600px]">
          <div className="grid grid-cols-7 border-b border-line bg-surface text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            {WEEKDAY_HEADERS.map((label) => (
              <div key={label} className="py-2.5">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-line">
            {monthDays.map((day) => {
              const key = toDateKey(day);
              const inCurrentMonth = day.getMonth() === cursor.getMonth();
              const isToday = isSameDay(day, today);
              const dayApts = derived.byDateKey.get(key) ?? [];
              const dayBlocks = blocksForDateKey(key);

              return (
                <div
                  key={key}
                  className={cn(
                    'min-h-[112px] p-2 transition',
                    !inCurrentMonth && 'bg-slate-50/70 text-slate-400',
                    isToday && 'bg-primary-50/40',
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setCursor(day);
                        setView('day');
                      }}
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition hover:bg-primary-100',
                        isToday ? 'bg-primary-700 text-white hover:bg-primary-800' : 'text-slate-700',
                        !inCurrentMonth && !isToday && 'text-slate-400',
                      )}
                    >
                      {day.getDate()}
                    </button>
                    {dayApts.length > 0 && (
                      <span className="text-[10px] font-medium text-slate-500">{dayApts.length} t.</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayBlocks.slice(0, 1).map((blk) => (
                      <div
                        key={blk.id}
                        className="truncate rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900"
                        title={blk.reason}
                      >
                        Bloqueo: {blk.reason}
                      </div>
                    ))}
                    {dayApts.slice(0, 2).map((apt) => {
                      const patient = derived.patientsById.get(apt.patientId);
                      return (
                        <button
                          key={apt.id}
                          type="button"
                          onClick={() => setSelectedAppointment(apt)}
                          className="block w-full truncate rounded bg-primary-50 px-1.5 py-0.5 text-left text-[11px] font-medium text-primary-900 transition hover:bg-primary-100"
                        >
                          <span className="font-semibold">{formatTime(apt.startAt)}</span>{' '}
                          {patient ? patient.lastName : 'Paciente'}
                        </button>
                      );
                    })}
                    {dayApts.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCursor(day);
                          setView('day');
                        }}
                        className="text-[10px] font-medium text-primary-700 hover:underline"
                      >
                        +{dayApts.length - 2} más
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </Card>
      )}

      <DoctorAppointmentDrawer
        appointment={selectedAppointment}
        patient={selectedAppointment ? derived.patientsById.get(selectedAppointment.patientId) : undefined}
        coverage={
          selectedAppointment
            ? derived.coveragesById.get(derived.patientsById.get(selectedAppointment.patientId)?.coverage.coverageId ?? '')
            : undefined
        }
        specialty={selectedAppointment ? derived.specialtiesById.get(selectedAppointment.specialtyId) : undefined}
        onClose={() => setSelectedAppointment(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
