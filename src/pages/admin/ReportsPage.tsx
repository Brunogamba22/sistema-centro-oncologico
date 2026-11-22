import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Bot, CalendarCheck2, CalendarX2, Download, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/data-display/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, CardContent, CardHeader, PageLoader, Select } from '@/components/ui';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import {
  chatbotIntentSeries,
  chatbotResolutionSummary,
  monthlyAppointmentSeries,
} from '@/data/reportsData';
import { useAsync } from '@/hooks/useAsync';
import { appointmentsService, auditService, catalogService, doctorsService } from '@/services';
import { formatNumber } from '@/utils/format';

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data, loading } = useAsync(async () => {
    const [appointments, doctors, specialties] = await Promise.all([
      appointmentsService.list(),
      doctorsService.list(),
      catalogService.listSpecialties(),
    ]);
    return { appointments, doctors, specialties };
  }, []);

  const [period, setPeriod] = useState<'6m' | '3m' | '1m'>('6m');
  const [specialtyFilter, setSpecialtyFilter] = useState('');

  const visibleMonths = useMemo(() => {
    const slice = period === '1m' ? 2 : period === '3m' ? 3 : 6;
    return monthlyAppointmentSeries.slice(-slice);
  }, [period]);

  const specialtyStats = useMemo(() => {
    if (!data) return [];
    const baseWeights = [92, 68, 84, 46, 54, 38, 32, 26];
    return data.specialties
      .filter((s) => !specialtyFilter || s.id === specialtyFilter)
      .map((s, idx) => {
        const liveCount = data.appointments.filter((a) => a.specialtyId === s.id).length;
        const total = (baseWeights[idx % baseWeights.length] ?? 30) + liveCount * 4;
        const ausentes = Math.max(1, Math.round(total * 0.06));
        return {
          name: s.name,
          turnos: total,
          ausentes,
          color: s.color,
        };
      })
      .sort((a, b) => b.turnos - a.turnos);
  }, [data, specialtyFilter]);

  const doctorStats = useMemo(() => {
    if (!data) return [];
    return data.doctors
      .filter((d) => d.active)
      .filter((d) => !specialtyFilter || d.specialtyIds.includes(specialtyFilter))
      .map((d, idx) => {
        const liveCount = data.appointments.filter((a) => a.doctorId === d.id).length;
        const atendidos = 42 + ((idx * 13) % 35) + liveCount * 3;
        const ausentes = 2 + (idx % 4);
        return {
          profesional: `${d.title} ${d.lastName}`,
          atendidos,
          ausentes,
        };
      })
      .sort((a, b) => b.atendidos - a.atendidos);
  }, [data, specialtyFilter]);

  const handleExport = async () => {
    await auditService.record({
      userId: user?.id ?? 'usr-001',
      userName: user?.name ?? 'Administrador',
      userRole: user?.role,
      action: 'exportar',
      module: 'Reportes',
      entity: 'ReportSummary',
      description: `Exportó reporte estadístico (período: ${period}).`,
    });
    toast({
      title: 'Reporte exportado (simulación)',
      description: 'Se generó el resumen estadístico y se registró el evento en Auditoría.',
      variant: 'success',
    });
  };

  if (loading || !data) return <PageLoader />;

  const totalAttended = visibleMonths.reduce((acc, m) => acc + m.atendidos, 0);
  const totalAbsent = visibleMonths.reduce((acc, m) => acc + m.ausentes, 0);
  const totalScheduled = visibleMonths.reduce((acc, m) => acc + m.confirmados + m.cancelados, 0);
  const absenteeismRate = totalScheduled ? ((totalAbsent / totalScheduled) * 100).toFixed(1) : '0.0';
  const attendanceRate = totalScheduled ? ((totalAttended / totalScheduled) * 100).toFixed(1) : '0.0';
  const botTotal = chatbotResolutionSummary.reduce((acc, item) => acc + item.value, 0);
  const botAutoPct = Math.round((chatbotResolutionSummary[0].value / Math.max(1, botTotal)) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes y estadísticas"
        description="Indicadores de turnos, especialidades, profesionales, ausentismo y desempeño del asistente virtual."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value as '6m' | '3m' | '1m')}
              options={[
                { value: '6m', label: 'Últimos 6 meses' },
                { value: '3m', label: 'Último trimestre' },
                { value: '1m', label: 'Últimos 2 meses' },
              ]}
            />
            <Select
              placeholder="Todas las especialidades"
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              options={data.specialties.map((s) => ({ value: s.id, label: s.name }))}
            />
            <Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Exportar resumen
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Turnos atendidos"
          value={formatNumber(totalAttended)}
          icon={CalendarCheck2}
          trend={{ value: '+8,4%', positive: true }}
          hint="en el período seleccionado"
        />
        <StatCard
          label="Tasa de asistencia"
          value={`${attendanceRate}%`}
          icon={TrendingUp}
          tone="accent"
          hint="sobre turnos programados"
        />
        <StatCard
          label="Tasa de ausentismo"
          value={`${absenteeismRate}%`}
          icon={CalendarX2}
          tone="rose"
          trend={{ value: '-1,8 pp', positive: true }}
          hint="reducción con recordatorios"
        />
        <StatCard
          label="Resolución del chatbot"
          value={`${botAutoPct}%`}
          icon={Bot}
          tone="primary"
          hint={`${formatNumber(botTotal)} consultas procesadas`}
        />
      </div>

      {/* Evolución de turnos + Tasa de ausentismo */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader
            title="Evolución mensual de turnos"
            description="Comparativa de turnos atendidos, cancelados y ausentes"
          />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visibleMonths} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5ECEE" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5ECEE', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="atendidos" name="Atendidos" stroke="#0F4C5C" fill="#0F4C5C" fillOpacity={0.16} strokeWidth={2} />
                <Area type="monotone" dataKey="cancelados" name="Cancelados" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="ausentes" name="Ausentes" stroke="#F43F5E" fill="#F43F5E" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader
            title="Tendencia de ausentismo (%)"
            description="Impacto de los recordatorios automáticos por WhatsApp"
          />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visibleMonths} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5ECEE" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis unit="%" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5ECEE', fontSize: 13 }} />
                <Line
                  type="monotone"
                  dataKey="tasaAusentismo"
                  name="Ausentismo (%)"
                  stroke="#F43F5E"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#F43F5E' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Especialidades + Profesionales */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-6">
          <CardHeader title="Turnos por especialidad" description="Volumen acumulado por prestación oncológica" />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={specialtyStats} margin={{ top: 8, right: 8, left: -16, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5ECEE" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} angle={-15} textAnchor="end" interval={0} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5ECEE', fontSize: 13 }} />
                <Bar dataKey="turnos" name="Turnos" radius={[6, 6, 0, 0]}>
                  {specialtyStats.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader title="Actividad por profesional" description="Consultas atendidas vs ausencias por médico activo" />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={doctorStats} layout="vertical" margin={{ top: 4, right: 16, left: 24, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5ECEE" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis type="category" dataKey="profesional" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#334155' }} width={110} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5ECEE', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="atendidos" name="Atendidos" fill="#0F4C5C" radius={[0, 6, 6, 0]} />
                <Bar dataKey="ausentes" name="Ausentes" fill="#F43F5E" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Chatbot */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader
            title="Consultas del chatbot por intención"
            description="Resolución automática vs derivación a recepción según motivo de contacto"
          />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chatbotIntentSeries} margin={{ top: 8, right: 8, left: -16, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5ECEE" vertical={false} />
                <XAxis dataKey="intent" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5ECEE', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="resueltosBot" name="Resueltos por Bot" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="derivadosHumano" name="Derivados a recepción" fill="#0F4C5C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader title="Efectividad del asistente virtual" description="Proporción de atención autónoma vs humana" />
          <CardContent className="grid items-center gap-4 sm:grid-cols-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chatbotResolutionSummary}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={4}
                  >
                    {chatbotResolutionSummary.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5ECEE', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-3 text-xs">
              {chatbotResolutionSummary.map((item) => (
                <li key={item.name} className="rounded-lg border border-line bg-surface/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(item.value)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
