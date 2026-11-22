import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  PageLoader,
  Select,
  TableContainer,
} from '@/components/ui';
import { PATIENT_STATUS_META } from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { useAsync } from '@/hooks/useAsync';
import {
  appointmentsService,
  catalogService,
  doctorPortalService,
  medicalRequestsService,
  patientsService,
} from '@/services';
import type { PatientStatus } from '@/types';
import { calculateAge, formatDate, formatDNI, formatPhoneAR } from '@/utils/format';

export default function DoctorPatientsPage() {
  const { user } = useAuth();
  const doctorId = user?.doctorId;

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [coverageFilter, setCoverageFilter] = useState<string>('all');

  const { data, loading } = useAsync(async () => {
    const [allPatients, allAppointments, allRequests, coverages] = await Promise.all([
      patientsService.list(),
      appointmentsService.list(),
      medicalRequestsService.list(),
      catalogService.listCoverages(),
    ]);

    const myPatients = doctorPortalService.filterAuthorizedPatients(allPatients, doctorId);
    const authorizedIds = new Set(myPatients.map((p) => p.id));

    return {
      myPatients,
      myAppointments: allAppointments.filter((a) => authorizedIds.has(a.patientId)),
      myRequests: allRequests.filter((r) => r.doctorId === doctorId && authorizedIds.has(r.patientId)),
      coverages,
    };
  }, [doctorId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');

    return data.myPatients
      .filter((p) => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        if (coverageFilter !== 'all' && p.coverage.coverageId !== coverageFilter) return false;
        if (!q) return true;
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        return fullName.includes(q) || (digits.length > 0 && p.dni.includes(digits)) || p.dni.includes(q);
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'es-AR'));
  }, [data, query, statusFilter, coverageFilter]);

  if (loading || !data) {
    return <PageLoader />;
  }

  const coveragesById = new Map(data.coverages.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis pacientes"
        description="Padrón de pacientes asignados a tu seguimiento profesional. Accedé a cada ficha para consultar datos administrativos, medicación declarada e historial."
        actions={
          <Badge variant="primary" className="px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Acceso restringido a tu padrón ({data.myPatients.length})
          </Badge>
        }
      />

      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative lg:col-span-6">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, apellido o DNI (ej.: 30123456)..."
              className="pl-9"
              aria-label="Buscar pacientes"
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todos los estados' },
                ...(Object.keys(PATIENT_STATUS_META) as PatientStatus[]).map((k) => ({
                  value: k,
                  label: PATIENT_STATUS_META[k].label,
                })),
              ]}
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              aria-label="Filtrar por cobertura"
              value={coverageFilter}
              onChange={(e) => setCoverageFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todas las coberturas' },
                ...data.coverages.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Listado */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No se encontraron pacientes"
            description="Probá limpiar los filtros o verificar el DNI/nombre buscado."
            action={
              (query || statusFilter !== 'all' || coverageFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('all');
                    setCoverageFilter('all');
                  }}
                >
                  Limpiar filtros
                </Button>
              )
            }
          />
        ) : (
          <TableContainer>
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Paciente</th>
                  <th className="px-4 py-3">DNI</th>
                  <th className="px-4 py-3">Cobertura (Admin.)</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Último / próximo turno</th>
                  <th className="px-4 py-3">Solicitudes activas</th>
                  <th className="px-5 py-3 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((patient) => {
                  const coverage = coveragesById.get(patient.coverage.coverageId);
                  const statusMeta = PATIENT_STATUS_META[patient.status];
                  const patientApts = data.myAppointments
                    .filter((a) => a.patientId === patient.id)
                    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
                  const latestApt = patientApts[0];
                  const activeReqs = data.myRequests.filter(
                    (r) =>
                      r.patientId === patient.id &&
                      ['pendiente', 'en_revision', 'info_solicitada'].includes(r.status),
                  ).length;

                  return (
                    <tr key={patient.id} className="transition hover:bg-surface/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${patient.firstName} ${patient.lastName}`} size="sm" />
                          <div className="min-w-0">
                            <Link
                              to={`/medico/pacientes/${patient.id}`}
                              className="block truncate font-semibold text-slate-900 hover:text-primary-700 hover:underline"
                            >
                              {patient.lastName}, {patient.firstName}
                            </Link>
                            <p className="text-xs text-slate-500">
                              {calculateAge(patient.birthDate)} años · {formatPhoneAR(patient.phone)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-700">{formatDNI(patient.dni)}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-slate-800">{coverage?.name ?? 'Sin cobertura'}</p>
                        <p className="text-[11px] text-slate-500">
                          {patient.coverage.plan ? `Plan ${patient.coverage.plan} · ` : ''}
                          {patient.coverage.affiliateNumber}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={statusMeta.variant} dot>
                          {statusMeta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {latestApt ? formatDate(latestApt.startAt) : 'Sin turnos'}
                      </td>
                      <td className="px-4 py-3.5">
                        {activeReqs > 0 ? (
                          <Badge variant="warning">{activeReqs} pendiente{activeReqs > 1 ? 's' : ''}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Al día</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link to={`/medico/pacientes/${patient.id}`}>
                          <Button size="sm" variant="outline" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                            Ver ficha
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableContainer>
        )}
      </Card>
    </div>
  );
}
