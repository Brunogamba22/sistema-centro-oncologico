import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { StatCard } from '@/components/data-display/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar, Badge, Button, Card, CardContent, CardHeader, PageLoader } from '@/components/ui';
import { APPOINTMENT_STATUS_META, CHANNEL_META, DAY_OF_WEEK_SHORT, UNAVAILABILITY_META } from '@/config/status';
import { useAsync } from '@/hooks/useAsync';
import { agendaService, appointmentsService, catalogService, doctorsService, patientsService } from '@/services';
import { addDays, toDateKey } from '@/utils/date';
import { formatDate, formatLongDate, formatNumber, formatTime } from '@/utils/format';

export default function DashboardPage() {
  const { data, loading } = useAsync(async () => {
    const [appointments, patients, doctors, specialties, blocks] = await Promise.all([
      appointmentsService.list(),
      patientsService.list(),
      doctorsService.list(),
      catalogService.listSpecialties(),
      agendaService.listBlocks(),
    ]);
    return { appointments, patients, doctors, specialties, blocks };
  }, []);

  const todayKey = toDateKey(new Date());

  const stats = useMemo(() => {
    if (!data) return null;
    const { appointments } = data;
    const todayItems = appointments.filter((a) => toDateKey(new Date(a.startAt)) === todayKey);
    const confirmed = appointments.filter((a) => ['confirmado', 'atendido', 'en_espera', 'en_atencion'].includes(a.status)).length;
    const pending = appointments.filter((a) => a.status === 'pendiente').length;
    const cancelled = appointments.filter((a) => a.status === 'cancelado' || a.status === 'ausente').length;
    const confirmRate = appointments.length ? Math.round((confirmed / appointments.length) * 100) : 0;

    return {
      total: appointments.length,
      todayCount: todayItems.length,
      confirmed,
      confirmRate,
      pending,
      cancelled,
    };
  }, [data, todayKey]);

  const weeklyActivity = useMemo(() => {
    if (!data) return [];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 4);
      const key = toDateKey(date);
      const dayItems = data.appointments.filter((a) => toDateKey(new Date(a.startAt)) === key);
      const dow = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      return {
        dia: `${DAY_OF_WEEK_SHORT[dow]} ${date.getDate()}`,
        confirmados: dayItems.filter((a) => ['confirmado', 'atendido', 'en_espera', 'en_atencion'].includes(a.status)).length,
        pendientes: dayItems.filter((a) => a.status === 'pendiente' || a.status === 'reprogramado').length,
        cancelados: dayItems.filter((a) => a.status === 'cancelado' || a.status === 'ausente').length,
      };
    });
  }, [data]);

  const specialtyDistribution = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    data.appointments.forEach((a) => counts.set(a.specialtyId, (counts.get(a.specialtyId) ?? 0) + 1));
    return data.specialties
      .map((s) => ({ id: s.id, name: s.name, color: s.color, value: counts.get(s.id) ?? 0 }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const upcomingAppointments = useMemo(() => {
    if (!data) return [];
    const now = Date.now() - 60 * 60 * 1000;
    return data.appointments
      .filter((a) => !['cancelado', 'atendido', 'ausente'].includes(a.status) && new Date(a.startAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 6);
  }, [data]);

  const alerts = useMemo(() => {
    if (!data) return [];
    const items: { id: string; title: string; detail: string; tone: 'warning' | 'danger' | 'info'; to: string }[] = [];

    const pendingToday = data.appointments.filter(
      (a) => toDateKey(new Date(a.startAt)) === todayKey && a.status === 'pendiente',
    );
    if (pendingToday.length > 0) {
      items.push({
        id: 'pending-today',
        title: `${pendingToday.length} turno(s) de hoy sin confirmar`,
        detail: 'Requieren confirmación telefónica o recordatorio por WhatsApp.',
        tone: 'warning',
        to: '/admin/turnos',
      });
    }

    const cancelledToday = data.appointments.filter(
      (a) => toDateKey(new Date(a.startAt)) === todayKey && a.status === 'cancelado',
    );
    if (cancelledToday.length > 0) {
      items.push({
        id: 'cancelled-today',
        title: `${cancelledToday.length} cancelación(es) en la jornada`,
        detail: 'Hay espacios liberados que pueden reasignarse a lista de espera.',
        tone: 'danger',
        to: '/admin/turnos',
      });
    }

    data.blocks.slice(0, 3).forEach((block) => {
      const doctor = data.doctors.find((d) => d.id === block.doctorId);
      items.push({
        id: block.id,
        title: `${UNAVAILABILITY_META[block.type].label}: ${doctor ? `${doctor.title} ${doctor.lastName}` : 'Profesional'}`,
        detail: `${formatDate(`${block.startDate}T12:00:00`)} · ${block.reason}`,
        tone: block.type === 'ausencia' ? 'danger' : 'info',
        to: '/admin/agenda',
      });
    });

    return items;
  }, [data, todayKey]);

  if (loading || !data || !stats) return <PageLoader />;

  const patientMap = new Map(data.patients.map((p) => [p.id, p]));
  const doctorMap = new Map(data.doctors.map((d) => [d.id, d]));
  const specialtyMap = new Map(data.specialties.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard administrativo"
        description={`${formatLongDate(new Date())} · Resumen operativo del centro`}
        actions={
          <>
            <Link to="/admin/agenda">
              <Button variant="outline" size="sm">
                Ver agenda médica
              </Button>
            </Link>
            <Link to="/admin/turnos">
              <Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Gestionar turnos
              </Button>
            </Link>
          </>
        }
      />

      {/* Indicadores principales */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Turnos programados"
          value={formatNumber(stats.total)}
          icon={CalendarClock}
          hint={`${stats.todayCount} en la jornada de hoy`}
        />
        <StatCard
          label="Confirmados / atendidos"
          value={formatNumber(stats.confirmed)}
          icon={CheckCircle2}
          tone="accent"
          trend={{ value: `${stats.confirmRate}%`, positive: true }}
          hint="tasa de cumplimiento"
        />
        <StatCard
          label="Pendientes de confirmación"
          value={formatNumber(stats.pending)}
          icon={Clock}
          tone="amber"
          hint="prioridad seguimiento"
        />
        <StatCard
          label="Cancelaciones y ausencias"
          value={formatNumber(stats.cancelled)}
          icon={CalendarX2}
          tone="rose"
          hint="espacios reasignables"
        />
      </div>

      {/* Gráficos: Actividad semanal + Especialidades */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader
            title="Actividad semanal de turnos"
            description="Distribución diaria de turnos confirmados, pendientes y cancelados"
          />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivity} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5ECEE" vertical={false} />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5ECEE', fontSize: 13 }} />
                <Bar dataKey="confirmados" name="Confirmados / Atendidos" fill="#0F4C5C" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pendientes" name="Pendientes" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cancelados" name="Cancelados / Ausentes" fill="#F43F5E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader title="Turnos por especialidad" description="Participación sobre el total de la agenda" />
          <CardContent className="grid items-center gap-4 sm:grid-cols-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {specialtyDistribution.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5ECEE', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2.5 text-xs">
              {specialtyDistribution.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-slate-700">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-semibold text-slate-900">{item.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Próximos turnos + Alertas */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader
            title="Próximos turnos"
            description="Turnos vigentes más cercanos en la agenda"
            action={
              <Link to="/admin/turnos" className="text-xs font-medium text-primary-700 hover:underline">
                Ver todos
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {upcomingAppointments.map((apt) => {
              const patient = patientMap.get(apt.patientId);
              const doctor = doctorMap.get(apt.doctorId);
              const specialty = specialtyMap.get(apt.specialtyId);
              const statusMeta = APPOINTMENT_STATUS_META[apt.status];
              const channelMeta = CHANNEL_META[apt.channel];

              return (
                <li key={apt.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-surface/60">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'} size="sm" />
                    <div className="min-w-0">
                      {patient ? (
                        <Link
                          to={`/admin/pacientes/${patient.id}`}
                          className="block truncate text-sm font-semibold text-slate-900 hover:text-primary-700"
                        >
                          {patient.lastName}, {patient.firstName}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold text-slate-900">Paciente</p>
                      )}
                      <p className="truncate text-xs text-slate-500">
                        {doctor ? `${doctor.title} ${doctor.lastName}` : 'Profesional'} · {specialty?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-surface px-2 py-1 text-xs font-medium text-slate-700">
                      {formatDate(apt.startAt)} · {formatTime(apt.startAt)} hs
                    </span>
                    <Badge variant={channelMeta.variant}>{channelMeta.label}</Badge>
                    <Badge variant={statusMeta.variant} dot>
                      {statusMeta.label}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader title="Alertas operativas" description="Novedades de turnos y agenda que requieren atención" />
          <ul className="divide-y divide-line">
            {alerts.map((alert) => {
              const Icon = alert.tone === 'danger' ? ShieldAlert : alert.tone === 'warning' ? AlertTriangle : CalendarCheck2;
              const toneClass =
                alert.tone === 'danger'
                  ? 'bg-rose-50 text-rose-600'
                  : alert.tone === 'warning'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-sky-50 text-sky-600';

              return (
                <li key={alert.id} className="px-5 py-3.5">
                  <Link to={alert.to} className="group flex items-start gap-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 group-hover:text-primary-700">{alert.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{alert.detail}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
