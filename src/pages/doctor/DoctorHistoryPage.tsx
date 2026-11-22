import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, History, Search, Stethoscope } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Drawer,
  EmptyState,
  Input,
  PageLoader,
  Select,
  TableContainer,
} from '@/components/ui';
import { APPOINTMENT_TYPE_LABELS, HISTORY_CATEGORY_META } from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { DomainTag } from '@/features/doctor/ClinicalScopeBanner';
import { useAsync } from '@/hooks/useAsync';
import {
  appointmentsService,
  doctorPortalService,
  doctorsService,
  patientHistoryService,
  patientsService,
} from '@/services';
import type { PatientHistoryCategory } from '@/types';
import { formatDateTime, formatDNI } from '@/utils/format';

interface AttentionRecord {
  id: string;
  date: string;
  patientId: string;
  doctorId?: string;
  category: PatientHistoryCategory;
  title: string;
  description: string;
  source: 'historial' | 'turno';
}

export default function DoctorHistoryPage() {
  const { user } = useAuth();
  const doctorId = user?.doctorId;

  const [query, setQuery] = useState('');
  const [patientFilter, setPatientFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [professionalFilter, setProfessionalFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<AttentionRecord | null>(null);

  const { data, loading } = useAsync(async () => {
    const [allPatients, allDoctors, allHistory, allAppointments] = await Promise.all([
      patientsService.list(),
      doctorsService.list(),
      patientHistoryService.listAll(),
      appointmentsService.list(),
    ]);

    const myPatients = doctorPortalService.filterAuthorizedPatients(allPatients, doctorId);
    const authorizedIds = new Set(myPatients.map((p) => p.id));

    const records: AttentionRecord[] = [
      ...allHistory
        .filter((h) => authorizedIds.has(h.patientId))
        .map((h) => ({
          id: `his-${h.id}`,
          date: h.date,
          patientId: h.patientId,
          doctorId: h.doctorId,
          category: h.category,
          title: h.title,
          description: h.description,
          source: 'historial' as const,
        })),
      ...allAppointments
        .filter((a) => authorizedIds.has(a.patientId) && a.status === 'atendido')
        .map((a) => ({
          id: `apt-${a.id}`,
          date: a.startAt,
          patientId: a.patientId,
          doctorId: a.doctorId,
          category: (a.type === 'tratamiento' ? 'tratamiento' : a.type === 'estudio' ? 'estudio' : 'consulta') as PatientHistoryCategory,
          title: `Atención completada · ${APPOINTMENT_TYPE_LABELS[a.type]}`,
          description: a.notes ?? 'Consulta finalizada sin observaciones adicionales registradas.',
          source: 'turno' as const,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      myPatients,
      doctors: allDoctors,
      records,
    };
  }, [doctorId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const patientsById = new Map(data.myPatients.map((p) => [p.id, p]));
    const q = query.trim().toLowerCase();

    return data.records.filter((r) => {
      if (patientFilter !== 'all' && r.patientId !== patientFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (professionalFilter === 'mine' && r.doctorId !== doctorId) return false;
      if (professionalFilter === 'others' && (!r.doctorId || r.doctorId === doctorId)) return false;
      if (!q) return true;
      const p = patientsById.get(r.patientId);
      const patientText = p ? `${p.firstName} ${p.lastName} ${p.dni}`.toLowerCase() : '';
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        patientText.includes(q)
      );
    });
  }, [data, query, patientFilter, categoryFilter, professionalFilter, doctorId]);

  if (loading || !data) {
    return <PageLoader />;
  }

  const patientsById = new Map(data.myPatients.map((p) => [p.id, p]));
  const doctorsById = new Map(data.doctors.map((d) => [d.id, d]));

  const selectedPatient = selectedRecord ? patientsById.get(selectedRecord.patientId) : undefined;
  const selectedDoctor = selectedRecord?.doctorId ? doctorsById.get(selectedRecord.doctorId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de atenciones"
        description="Registro cronológico de consultas anteriores, tratamientos, estudios e interconsultas de tus pacientes autorizados."
      />

      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative lg:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por paciente, DNI o descripción..."
              className="pl-9"
              aria-label="Buscar en historial"
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              aria-label="Filtrar por paciente"
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todos mis pacientes' },
                ...data.myPatients.map((p) => ({
                  value: p.id,
                  label: `${p.lastName}, ${p.firstName}`,
                })),
              ]}
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              aria-label="Filtrar por categoría"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todas las categorías' },
                ...(Object.keys(HISTORY_CATEGORY_META) as PatientHistoryCategory[]).map((k) => ({
                  value: k,
                  label: HISTORY_CATEGORY_META[k].label,
                })),
              ]}
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              aria-label="Filtrar por profesional"
              value={professionalFilter}
              onChange={(e) => setProfessionalFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todos los prof.' },
                { value: 'mine', label: 'Mis atenciones' },
                { value: 'others', label: 'Interconsultas' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={History}
            title="Sin atenciones registradas para los filtros actuales"
            description="Ajustá los filtros para ver el historial cronológico completo."
          />
        ) : (
          <TableContainer>
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Fecha y hora</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Atención / Registro</th>
                  <th className="px-4 py-3">Profesional</th>
                  <th className="px-4 py-3">Clasificación</th>
                  <th className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((rec) => {
                  const patient = patientsById.get(rec.patientId);
                  const doctor = rec.doctorId ? doctorsById.get(rec.doctorId) : undefined;
                  const catMeta = HISTORY_CATEGORY_META[rec.category];
                  const domain = rec.category === 'administrativo' ? 'administrativo' : 'clinico';

                  return (
                    <tr key={rec.id} className="transition hover:bg-surface/60">
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-600">
                        {formatDateTime(rec.date)}
                      </td>
                      <td className="px-4 py-3.5">
                        {patient ? (
                          <div className="flex items-center gap-2.5">
                            <Avatar name={`${patient.firstName} ${patient.lastName}`} size="sm" />
                            <div>
                              <Link
                                to={`/medico/pacientes/${patient.id}`}
                                className="font-medium text-slate-900 hover:text-primary-700 hover:underline"
                              >
                                {patient.firstName} {patient.lastName}
                              </Link>
                              <p className="text-[11px] text-slate-500">DNI {formatDNI(patient.dni)}</p>
                            </div>
                          </div>
                        ) : (
                          'Paciente'
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-3.5">
                        <p className="truncate font-medium text-slate-900">{rec.title}</p>
                        <p className="truncate text-xs text-slate-500">{rec.description}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-700">
                        {doctor ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Stethoscope className="h-3.5 w-3.5 text-primary-600" />
                            {doctor.title} {doctor.firstName} {doctor.lastName}
                          </span>
                        ) : (
                          <span className="text-slate-400">Gestión del centro</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <DomainTag domain={domain} />
                          <Badge variant={catMeta.variant}>{catMeta.label}</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedRecord(rec)}>
                          Detalle
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableContainer>
        )}
      </Card>

      <Drawer
        open={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord?.title ?? 'Detalle de atención'}
        description={selectedRecord ? formatDateTime(selectedRecord.date) : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedRecord(null)}>
              Cerrar
            </Button>
            {selectedPatient && (
              <Link to={`/medico/pacientes/${selectedPatient.id}`}>
                <Button variant="primary" rightIcon={<ExternalLink className="h-4 w-4" />}>
                  Abrir ficha del paciente
                </Button>
              </Link>
            )}
          </>
        }
      >
        {selectedRecord && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <DomainTag domain={selectedRecord.category === 'administrativo' ? 'administrativo' : 'clinico'} />
              <Badge variant={HISTORY_CATEGORY_META[selectedRecord.category].variant}>
                {HISTORY_CATEGORY_META[selectedRecord.category].label}
              </Badge>
            </div>

            {selectedPatient && (
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-xs text-slate-500">Paciente</p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {selectedPatient.firstName} {selectedPatient.lastName} · DNI {formatDNI(selectedPatient.dni)}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profesional interviniente</p>
              <p className="mt-1 font-medium text-slate-900">
                {selectedDoctor
                  ? `${selectedDoctor.title} ${selectedDoctor.firstName} ${selectedDoctor.lastName} (${selectedDoctor.licenseNumber})`
                  : 'Registro administrativo / recepción'}
              </p>
            </div>

            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detalle registrado</p>
              <p className="mt-1.5 leading-relaxed text-slate-700">{selectedRecord.description}</p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
