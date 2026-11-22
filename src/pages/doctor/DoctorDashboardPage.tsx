import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Pill,
  Stethoscope,
  Users,
} from 'lucide-react';
import { StatCard } from '@/components/data-display/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar, Badge, Button, Card, CardContent, CardHeader, EmptyState, PageLoader } from '@/components/ui';
import {
  APPOINTMENT_STATUS_META,
  APPOINTMENT_TYPE_LABELS,
  HISTORY_CATEGORY_META,
  MEDICAL_REQUEST_STATUS_META,
  MEDICAL_REQUEST_TYPE_META,
  PRIORITY_META,
} from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { ClinicalResponsibilityNotice, DomainTag } from '@/features/doctor/ClinicalScopeBanner';
import { DoctorAppointmentDrawer } from '@/features/doctor/DoctorAppointmentDrawer';
import { useAsync } from '@/hooks/useAsync';
import {
  appointmentsService,
  catalogService,
  doctorPortalService,
  doctorsService,
  documentsService,
  medicalRequestsService,
  patientHistoryService,
  patientsService,
} from '@/services';
import type { Appointment, AppointmentStatus } from '@/types';
import { isSameDay } from '@/utils/date';
import { formatDate, formatDateTime, formatLongDate, formatTime } from '@/utils/format';

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const doctorId = user?.doctorId;
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const { data, loading, reload } = useAsync(async () => {
    const [doctor, allPatients, allAppointments, allRequests, allDocs, allHistory, coverages, specialties] =
      await Promise.all([
        doctorId ? doctorsService.getById(doctorId) : Promise.resolve(undefined),
        patientsService.list(),
        appointmentsService.list(),
        medicalRequestsService.list(),
        documentsService.listAll(),
        patientHistoryService.listAll(),
        catalogService.listCoverages(),
        catalogService.listSpecialties(),
      ]);

    const myPatients = doctorPortalService.filterAuthorizedPatients(allPatients, doctorId);
    const authorizedIds = new Set(myPatients.map((p) => p.id));

    return {
      doctor,
      allPatients,
      myPatients,
      authorizedIds,
      myAppointments: allAppointments
        .filter((a) => a.doctorId === doctorId)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
      myRequests: allRequests
        .filter((r) => r.doctorId === doctorId && authorizedIds.has(r.patientId))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      myDocuments: allDocs.filter((d) => authorizedIds.has(d.patientId)),
      myHistory: allHistory.filter((h) => authorizedIds.has(h.patientId)),
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

    const todayAppointments = data.myAppointments.filter((a) => isSameDay(new Date(a.startAt), today));
    const attendedToday = todayAppointments.filter((a) => a.status === 'atendido').length;
    const pendingToday = todayAppointments.filter((a) =>
      ['pendiente', 'confirmado', 'en_espera', 'en_atencion'].includes(a.status),
    ).length;

    const pendingRequests = data.myRequests.filter((r) =>
      ['pendiente', 'en_revision', 'info_solicitada'].includes(r.status),
    );
    const pendingPrescriptions = pendingRequests.filter((r) => r.type === 'receta').length;

    // Actividad reciente combinada (historial + documentos recientes)
    const activity = [
      ...data.myHistory.map((h) => ({
        id: `his-${h.id}`,
        date: h.date,
        title: h.title,
        subtitle: patientsById.get(h.patientId)
          ? `${patientsById.get(h.patientId)!.firstName} ${patientsById.get(h.patientId)!.lastName}`
          : 'Paciente',
        tag: HISTORY_CATEGORY_META[h.category].label,
        variant: HISTORY_CATEGORY_META[h.category].variant,
        domain: h.category === 'administrativo' ? ('administrativo' as const) : ('clinico' as const),
        patientId: h.patientId,
      })),
      ...data.myDocuments.slice(0, 4).map((d) => ({
        id: `doc-${d.id}`,
        date: d.createdAt,
        title: `Documento recibido: ${d.name}`,
        subtitle: patientsById.get(d.patientId)
          ? `${patientsById.get(d.patientId)!.firstName} ${patientsById.get(d.patientId)!.lastName}`
          : 'Paciente',
        tag: 'Documento',
        variant: 'info' as const,
        domain: d.category === 'consentimiento' || d.category === 'otro' ? ('administrativo' as const) : ('clinico' as const),
        patientId: d.patientId,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);

    return {
      patientsById,
      coveragesById,
      specialtiesById,
      todayAppointments,
      attendedToday,
      pendingToday,
      pendingRequests,
      pendingPrescriptions,
      activity,
    };
  }, [data, today]);

  const handleUpdateStatus = async (id: string, status: AppointmentStatus, notes?: string) => {
    await appointmentsService.updateStatus(id, status, notes);
    toast({
      title: 'Turno actualizado',
      description: `Estado cambiado a "${APPOINTMENT_STATUS_META[status].label}".`,
      variant: 'success',
    });
    await reload();
  };

  if (loading || !data || !derived) {
    return <PageLoader />;
  }

  const doctorName = data.doctor ? `${data.doctor.title} ${data.doctor.firstName} ${data.doctor.lastName}` : user?.name;
  const specialtyNames = data.doctor
    ? data.doctor.specialtyIds
        .map((id) => derived.specialtiesById.get(id)?.name)
        .filter(Boolean)
        .join(' · ')
    : user?.position;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${doctorName}`}
        description={
          <span>
            {formatLongDate(today)} · {specialtyNames}
            {data.doctor ? ` · ${data.doctor.licenseNumber}` : ''}
          </span>
        }
        actions={
          <>
            <Link to="/medico/agenda">
              <Button variant="outline" leftIcon={<CalendarDays className="h-4 w-4" />}>
                Mi agenda
              </Button>
            </Link>
            <Link to="/medico/recetas">
              <Button variant="primary" leftIcon={<Pill className="h-4 w-4" />}>
                Solicitudes de recetas
              </Button>
            </Link>
          </>
        }
      />

      <ClinicalResponsibilityNotice compact />

      {/* KPIs del día */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Turnos del día"
          value={derived.todayAppointments.length}
          icon={CalendarDays}
          tone="primary"
          hint={`${derived.pendingToday} por atender`}
        />
        <StatCard
          label="Pacientes atendidos hoy"
          value={derived.attendedToday}
          icon={CheckCircle2}
          tone="accent"
          hint={`${data.myPatients.length} pacientes en tu padrón`}
        />
        <StatCard
          label="Turnos pendientes hoy"
          value={derived.pendingToday}
          icon={Clock}
          tone="amber"
          hint="Confirmados, en espera o en atención"
        />
        <StatCard
          label="Solicitudes pendientes"
          value={derived.pendingRequests.length}
          icon={ClipboardList}
          tone="rose"
          hint={`${derived.pendingPrescriptions} de recetas para revisión`}
        />
      </div>

      {/* Turnos del día + Solicitudes pendientes */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader
            title="Turnos de hoy"
            description="Pacientes agendados en tu consultorio para la jornada actual"
            action={
              <Link
                to="/medico/agenda"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
              >
                Ver calendario completo
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardContent className="p-0">
            {derived.todayAppointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No tenés turnos programados para hoy"
                description="Consultá tu agenda semanal o mensual para ver los próximos controles."
              />
            ) : (
              <ul className="divide-y divide-line">
                {derived.todayAppointments.map((apt) => {
                  const patient = derived.patientsById.get(apt.patientId);
                  const statusMeta = APPOINTMENT_STATUS_META[apt.status];
                  return (
                    <li
                      key={apt.id}
                      className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-surface/60 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="w-14 shrink-0 rounded-lg bg-primary-50 px-2 py-1.5 text-center">
                          <p className="text-xs font-semibold text-primary-800">{formatTime(apt.startAt)}</p>
                          <p className="text-[10px] text-primary-600">{formatTime(apt.endAt)}</p>
                        </div>
                        <Avatar
                          name={patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {patient && data.authorizedIds.has(patient.id) ? (
                              <Link
                                to={`/medico/pacientes/${patient.id}`}
                                className="truncate text-sm font-semibold text-slate-900 hover:text-primary-700 hover:underline"
                              >
                                {patient.firstName} {patient.lastName}
                              </Link>
                            ) : (
                              <span className="truncate text-sm font-semibold text-slate-900">
                                {patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'}
                              </span>
                            )}
                            <Badge variant={statusMeta.variant} dot>
                              {statusMeta.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {APPOINTMENT_TYPE_LABELS[apt.type]}
                            {apt.notes ? ` · ${apt.notes}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                        {apt.status === 'en_espera' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => void handleUpdateStatus(apt.id, 'en_atencion')}
                          >
                            Llamar
                          </Button>
                        )}
                        {apt.status === 'en_atencion' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => void handleUpdateStatus(apt.id, 'atendido')}
                          >
                            Finalizar
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setSelectedAppointment(apt)}>
                          Detalle
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader
            title="Solicitudes que requieren revisión"
            description="Recetas, órdenes e informes asignados a tu perfil"
            action={
              <Link
                to="/medico/pendientes"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
              >
                Ver todas
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardContent className="p-0">
            {derived.pendingRequests.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Sin solicitudes pendientes"
                description="Todas tus solicitudes asignadas fueron resueltas."
              />
            ) : (
              <ul className="divide-y divide-line">
                {derived.pendingRequests.slice(0, 5).map((req) => {
                  const patient = derived.patientsById.get(req.patientId);
                  const typeMeta = MEDICAL_REQUEST_TYPE_META[req.type];
                  const statusMeta = MEDICAL_REQUEST_STATUS_META[req.status];
                  const priorityMeta = PRIORITY_META[req.priority];
                  return (
                    <li key={req.id} className="px-5 py-3.5 hover:bg-surface/60">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                            <Badge variant={statusMeta.variant} dot>
                              {statusMeta.label}
                            </Badge>
                            {req.priority === 'alta' && <Badge variant={priorityMeta.variant}>Alta</Badge>}
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-slate-900">
                            {patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                            {req.medicationDetails?.declaredMedication ?? req.description}
                          </p>
                        </div>
                        <Link
                          to={req.type === 'receta' ? '/medico/recetas' : '/medico/pendientes'}
                          className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-primary-700 transition hover:bg-primary-50"
                        >
                          Revisar
                        </Link>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400">Actualizada {formatDateTime(req.updatedAt)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actividad reciente + Accesos rápidos */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader
            title="Actividad reciente en tus pacientes"
            description="Últimas atenciones registradas, estudios y novedades administrativas"
            action={
              <Link
                to="/medico/historial"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
              >
                Historial de atenciones
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardContent className="p-0">
            <ul className="divide-y divide-line">
              {derived.activity.map((item) => (
                <li key={item.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Activity className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Link
                          to={`/medico/pacientes/${item.patientId}`}
                          className="font-medium text-primary-700 hover:underline"
                        >
                          {item.subtitle}
                        </Link>
                        <span>·</span>
                        <span>{formatDate(item.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <DomainTag domain={item.domain} />
                    <Badge variant={item.variant}>{item.tag}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader title="Accesos rápidos" description="Módulos frecuentes de tu gestión diaria" />
          <CardContent className="space-y-2.5">
            <Link
              to="/medico/pacientes"
              className="flex items-center justify-between rounded-xl border border-line p-3.5 transition hover:border-primary-200 hover:bg-primary-50/40"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Mis pacientes</p>
                  <p className="text-xs text-slate-500">{data.myPatients.length} pacientes autorizados</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              to="/medico/documentacion"
              className="flex items-center justify-between rounded-xl border border-line p-3.5 transition hover:border-primary-200 hover:bg-primary-50/40"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Documentación recibida</p>
                  <p className="text-xs text-slate-500">{data.myDocuments.length} archivos disponibles</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              to="/medico/perfil"
              className="flex items-center justify-between rounded-xl border border-line p-3.5 transition hover:border-primary-200 hover:bg-primary-50/40"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Stethoscope className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Mi perfil profesional</p>
                  <p className="text-xs text-slate-500">Horarios y datos de matrícula</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </CardContent>
        </Card>
      </div>

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
