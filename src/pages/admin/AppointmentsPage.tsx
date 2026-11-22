import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  List,
  Plus,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  PageLoader,
  Pagination,
  Select,
  TableContainer,
} from '@/components/ui';
import { APPOINTMENT_STATUS_META, APPOINTMENT_TYPE_LABELS, CHANNEL_META } from '@/config/status';
import { useToast } from '@/context/toast/useToast';
import { AppointmentDetailDrawer } from '@/features/appointments/AppointmentDetailDrawer';
import { AppointmentFormModal } from '@/features/appointments/AppointmentFormModal';
import { useAsync } from '@/hooks/useAsync';
import { appointmentsService, catalogService, doctorsService, patientsService } from '@/services';
import type { Appointment, AppointmentStatus, Channel } from '@/types';
import { cn } from '@/utils/cn';
import { getMonthGrid, isSameDay, toDateKey } from '@/utils/date';
import { formatDate, formatDNI, formatTime } from '@/utils/format';

const PAGE_SIZE = 10;
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function AppointmentsPage() {
  const { toast } = useToast();
  const { data, loading, reload } = useAsync(async () => {
    const [appointments, patients, doctors, specialties, coverages] = await Promise.all([
      appointmentsService.list(),
      patientsService.list(),
      doctorsService.list(),
      catalogService.listSpecialties(),
      catalogService.listCoverages(),
    ]);
    return { appointments, patients, doctors, specialties, coverages };
  }, []);

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [page, setPage] = useState(1);

  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

  const patientMap = useMemo(() => new Map(data?.patients.map((p) => [p.id, p]) ?? []), [data?.patients]);
  const doctorMap = useMemo(() => new Map(data?.doctors.map((d) => [d.id, d]) ?? []), [data?.doctors]);
  const specialtyMap = useMemo(() => new Map(data?.specialties.map((s) => [s.id, s]) ?? []), [data?.specialties]);
  const coverageMap = useMemo(() => new Map(data?.coverages.map((c) => [c.id, c]) ?? []), [data?.coverages]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.appointments
      .filter((apt) => {
        if (doctorFilter && apt.doctorId !== doctorFilter) return false;
        if (specialtyFilter && apt.specialtyId !== specialtyFilter) return false;
        if (statusFilter && apt.status !== statusFilter) return false;
        if (channelFilter && apt.channel !== channelFilter) return false;
        if (q) {
          const patient = patientMap.get(apt.patientId);
          const full = `${patient?.firstName ?? ''} ${patient?.lastName ?? ''} ${patient?.dni ?? ''}`.toLowerCase();
          if (!full.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  }, [data, doctorFilter, specialtyFilter, statusFilter, channelFilter, search, patientMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const monthGrid = useMemo(
    () => getMonthGrid(calendarMonth.getFullYear(), calendarMonth.getMonth()),
    [calendarMonth],
  );

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    filtered.forEach((apt) => {
      const key = toDateKey(new Date(apt.startAt));
      const list = map.get(key) ?? [];
      list.push(apt);
      map.set(key, list);
    });
    return map;
  }, [filtered]);

  const resetFilters = () => {
    setSearch('');
    setDoctorFilter('');
    setSpecialtyFilter('');
    setStatusFilter('');
    setChannelFilter('');
    setPage(1);
  };

  const hasFilters = Boolean(search || doctorFilter || specialtyFilter || statusFilter || channelFilter);

  const handleOpenCreate = () => {
    setEditingAppointment(null);
    setFormOpen(true);
  };

  const handleOpenReschedule = (apt: Appointment) => {
    setDetailAppointment(null);
    setEditingAppointment(apt);
    setFormOpen(true);
  };

  const handleFormSubmit = async (result: Parameters<React.ComponentProps<typeof AppointmentFormModal>['onSubmit']>[0]) => {
    if (result.mode === 'create' && result.payload) {
      await appointmentsService.create(result.payload);
      toast({ title: 'Turno creado', description: 'El turno fue registrado en la agenda de demostración.', variant: 'success' });
    } else if (result.mode === 'reschedule' && result.appointmentId && result.startAt && result.endAt) {
      await appointmentsService.reschedule(result.appointmentId, result.startAt, result.endAt, result.notes);
      toast({ title: 'Turno reprogramado', description: 'Se actualizó la fecha y horario del turno.', variant: 'info' });
    }
    await reload();
  };

  const handleStatusChange = async (apt: Appointment, nextStatus: AppointmentStatus) => {
    if (nextStatus === 'cancelado') {
      setDetailAppointment(null);
      setCancelTarget(apt);
      return;
    }
    await appointmentsService.updateStatus(apt.id, nextStatus);
    toast({
      title: 'Estado actualizado',
      description: `El turno pasó a "${APPOINTMENT_STATUS_META[nextStatus].label}".`,
      variant: 'success',
    });
    setDetailAppointment(null);
    await reload();
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    await appointmentsService.updateStatus(cancelTarget.id, 'cancelado');
    toast({ title: 'Turno cancelado', description: 'El espacio quedó liberado en la agenda.', variant: 'danger' });
    setCancelTarget(null);
    await reload();
  };

  if (loading || !data) return <PageLoader />;

  const selectedDayAppointments = (appointmentsByDate.get(selectedDateKey) ?? []).sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de turnos"
        description="Administrá el listado y calendario de turnos, reprogramaciones y cancelaciones."
        actions={
          <>
            <div className="inline-flex rounded-lg border border-line bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
                  view === 'list' ? 'bg-primary-700 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <List className="h-3.5 w-3.5" /> Listado
              </button>
              <button
                type="button"
                onClick={() => setView('calendar')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
                  view === 'calendar' ? 'bg-primary-700 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" /> Calendario
              </button>
            </div>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
              Nuevo turno
            </Button>
          </>
        }
      />

      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder="Buscar paciente o DNI…"
            leftIcon={<Search />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            placeholder="Todos los médicos"
            value={doctorFilter}
            onChange={(e) => {
              setDoctorFilter(e.target.value);
              setPage(1);
            }}
            options={data.doctors.map((d) => ({ value: d.id, label: `${d.title} ${d.lastName}` }))}
          />
          <Select
            placeholder="Todas las especialidades"
            value={specialtyFilter}
            onChange={(e) => {
              setSpecialtyFilter(e.target.value);
              setPage(1);
            }}
            options={data.specialties.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Select
            placeholder="Todos los estados"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={(Object.keys(APPOINTMENT_STATUS_META) as AppointmentStatus[]).map((k) => ({
              value: k,
              label: APPOINTMENT_STATUS_META[k].label,
            }))}
          />
          <Select
            placeholder="Todos los canales"
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(e.target.value);
              setPage(1);
            }}
            options={(Object.keys(CHANNEL_META) as Channel[]).map((k) => ({
              value: k,
              label: CHANNEL_META[k].label,
            }))}
          />
        </CardContent>
        {hasFilters && (
          <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-xs text-slate-500">
            <span>{filtered.length} turno(s) encontrados</span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-medium text-primary-700 hover:underline"
            >
              <RotateCcw className="h-3 w-3" /> Limpiar filtros
            </button>
          </div>
        )}
      </Card>

      {view === 'list' ? (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No hay turnos para los filtros aplicados"
              description="Probá ajustando los filtros o registrá un nuevo turno."
              action={
                <Button size="sm" variant="outline" onClick={resetFilters}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <>
              <TableContainer>
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-line bg-surface/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Fecha y hora</th>
                      <th className="px-5 py-3">Paciente</th>
                      <th className="px-5 py-3">Profesional / Especialidad</th>
                      <th className="px-5 py-3">Tipo</th>
                      <th className="px-5 py-3">Canal</th>
                      <th className="px-5 py-3">Estado</th>
                      <th className="px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {paginated.map((apt) => {
                      const patient = patientMap.get(apt.patientId);
                      const doctor = doctorMap.get(apt.doctorId);
                      const specialty = specialtyMap.get(apt.specialtyId);
                      const statusMeta = APPOINTMENT_STATUS_META[apt.status];
                      const channelMeta = CHANNEL_META[apt.channel];
                      const canModify = !['cancelado', 'atendido'].includes(apt.status);

                      return (
                        <tr key={apt.id} className="transition hover:bg-surface/50">
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <p className="font-medium text-slate-900">{formatDate(apt.startAt)}</p>
                            <p className="text-xs text-slate-500">
                              {formatTime(apt.startAt)} - {formatTime(apt.endAt)} hs
                            </p>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={patient ? `${patient.firstName} ${patient.lastName}` : 'P'} size="sm" />
                              <div className="min-w-0">
                                {patient ? (
                                  <Link
                                    to={`/admin/pacientes/${patient.id}`}
                                    className="block truncate font-medium text-slate-900 hover:text-primary-700"
                                  >
                                    {patient.lastName}, {patient.firstName}
                                  </Link>
                                ) : (
                                  <span className="font-medium text-slate-900">—</span>
                                )}
                                {patient && <p className="text-xs text-slate-500">DNI {formatDNI(patient.dni)}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-800">
                              {doctor ? `${doctor.title} ${doctor.firstName} ${doctor.lastName}` : '—'}
                            </p>
                            <p className="text-xs text-slate-500">{specialty?.name ?? '—'}</p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                            {APPOINTMENT_TYPE_LABELS[apt.type]}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <Badge variant={channelMeta.variant}>{channelMeta.label}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <Badge variant={statusMeta.variant} dot>
                              {statusMeta.label}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Consultar detalle"
                                onClick={() => setDetailAppointment(apt)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canModify && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Reprogramar"
                                    onClick={() => handleOpenReschedule(apt)}
                                  >
                                    <CalendarClock className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Cancelar turno"
                                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                    onClick={() => setCancelTarget(apt)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableContainer>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader
              title={calendarMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())}
              action={
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      setCalendarMonth(now);
                      setSelectedDateKey(toDateKey(now));
                    }}
                  >
                    Hoy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              }
            />
            <CardContent className="overflow-x-auto p-3 sm:p-5">
              <div className="min-w-[460px]">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthGrid.map((date) => {
                  const key = toDateKey(date);
                  const inMonth = date.getMonth() === calendarMonth.getMonth();
                  const isToday = isSameDay(date, new Date());
                  const isSelected = key === selectedDateKey;
                  const dayItems = appointmentsByDate.get(key) ?? [];

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDateKey(key)}
                      className={cn(
                        'flex min-h-[76px] flex-col rounded-lg border p-1.5 text-left transition',
                        isSelected
                          ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-500'
                          : 'border-line bg-white hover:bg-surface',
                        !inMonth && 'opacity-45',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                          isToday ? 'bg-primary-700 text-white' : 'text-slate-700',
                        )}
                      >
                        {date.getDate()}
                      </span>
                      {dayItems.length > 0 && (
                        <span className="mt-auto rounded bg-accent-50 px-1.5 py-0.5 text-[11px] font-medium text-accent-700">
                          {dayItems.length} turno{dayItems.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader
              title={`Turnos del ${formatDate(`${selectedDateKey}T12:00:00`)}`}
              description={`${selectedDayAppointments.length} turno(s) en la fecha seleccionada`}
            />
            {selectedDayAppointments.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="Sin turnos"
                description="No hay turnos registrados para este día con los filtros actuales."
              />
            ) : (
              <ul className="divide-y divide-line">
                {selectedDayAppointments.map((apt) => {
                  const patient = patientMap.get(apt.patientId);
                  const doctor = doctorMap.get(apt.doctorId);
                  const statusMeta = APPOINTMENT_STATUS_META[apt.status];
                  return (
                    <li key={apt.id}>
                      <button
                        type="button"
                        onClick={() => setDetailAppointment(apt)}
                        className="flex w-full items-start justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-surface/60"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-primary-700">
                            {formatTime(apt.startAt)} - {formatTime(apt.endAt)} hs
                          </p>
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {patient ? `${patient.lastName}, ${patient.firstName}` : 'Paciente'}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {doctor ? `${doctor.title} ${doctor.lastName}` : 'Profesional'}
                          </p>
                        </div>
                        <Badge variant={statusMeta.variant} dot>
                          {statusMeta.label}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      <AppointmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        appointment={editingAppointment}
        defaultDateKey={selectedDateKey}
        patients={data.patients}
        doctors={data.doctors}
        specialties={data.specialties}
        onSubmit={handleFormSubmit}
      />

      <AppointmentDetailDrawer
        appointment={detailAppointment}
        onClose={() => setDetailAppointment(null)}
        patient={detailAppointment ? patientMap.get(detailAppointment.patientId) : undefined}
        doctor={detailAppointment ? doctorMap.get(detailAppointment.doctorId) : undefined}
        specialty={detailAppointment ? specialtyMap.get(detailAppointment.specialtyId) : undefined}
        coverage={
          detailAppointment && patientMap.get(detailAppointment.patientId)
            ? coverageMap.get(patientMap.get(detailAppointment.patientId)!.coverage.coverageId)
            : undefined
        }
        onReschedule={handleOpenReschedule}
        onChangeStatus={handleStatusChange}
      />

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Confirmar cancelación de turno"
        description="Esta acción cambiará el estado del turno a Cancelado."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>
              Volver
            </Button>
            <Button variant="danger" onClick={confirmCancel}>
              Cancelar turno
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <p className="text-sm text-slate-600">
            ¿Deseás cancelar el turno de{' '}
            <strong>
              {patientMap.get(cancelTarget.patientId)?.lastName}, {patientMap.get(cancelTarget.patientId)?.firstName}
            </strong>{' '}
            del {formatDate(cancelTarget.startAt)} a las {formatTime(cancelTarget.startAt)} hs?
          </p>
        )}
      </Modal>
    </div>
  );
}
