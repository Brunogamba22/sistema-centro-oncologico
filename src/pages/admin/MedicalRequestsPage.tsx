import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Eye,
  FileCheck2,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react';
import { StatCard } from '@/components/data-display/StatCard';
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
import {
  CHANNEL_META,
  MEDICAL_REQUEST_STATUS_META,
  MEDICAL_REQUEST_TYPE_META,
  PRIORITY_META,
} from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { MedicalRequestDetailDrawer } from '@/features/requests/MedicalRequestDetailDrawer';
import { MedicalRequestFormModal } from '@/features/requests/MedicalRequestFormModal';
import { useAsync } from '@/hooks/useAsync';
import { auditService, doctorsService, medicalRequestsService, patientsService } from '@/services';
import type { MedicalRequestPayload } from '@/services/medicalRequestsService';
import type { MedicalRequest, MedicalRequestStatus, MedicalRequestType } from '@/types';
import { formatDateTime } from '@/utils/format';

export default function MedicalRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data, loading, reload } = useAsync(async () => {
    const [requests, patients, doctors] = await Promise.all([
      medicalRequestsService.list(),
      patientsService.list(),
      doctorsService.list(),
    ]);
    return { requests, patients, doctors };
  }, []);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const patientMap = useMemo(() => new Map(data?.patients.map((p) => [p.id, p]) ?? []), [data?.patients]);
  const doctorMap = useMemo(() => new Map(data?.doctors.map((d) => [d.id, d]) ?? []), [data?.doctors]);

  const selectedRequest: MedicalRequest | null = useMemo(
    () => data?.requests.find((r) => r.id === selectedId) ?? null,
    [data?.requests, selectedId],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.requests.filter((req) => {
      if (typeFilter && req.type !== typeFilter) return false;
      if (statusFilter && req.status !== statusFilter) return false;
      if (doctorFilter && req.doctorId !== doctorFilter) return false;
      if (q) {
        const patient = patientMap.get(req.patientId);
        const text = `${req.id} ${req.description} ${patient?.firstName ?? ''} ${patient?.lastName ?? ''} ${patient?.dni ?? ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, typeFilter, statusFilter, doctorFilter, patientMap]);

  const hasFilters = Boolean(search || typeFilter || statusFilter || doctorFilter);

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setDoctorFilter('');
  };

  const handleCreate = async (payload: MedicalRequestPayload) => {
    const created = await medicalRequestsService.create(payload, user?.name ?? 'Recepción');
    await auditService.record({
      userId: user?.id ?? 'usr-001',
      userName: user?.name ?? 'Usuario',
      userRole: user?.role,
      action: 'crear',
      module: 'Solicitudes médicas',
      entity: 'MedicalRequest',
      entityId: created.id,
      description: `Registró solicitud ${MEDICAL_REQUEST_TYPE_META[payload.type].label} (${created.id}).`,
    });
    toast({
      title: 'Solicitud registrada',
      description: `Se creó la solicitud ${created.id.toUpperCase()} para seguimiento.`,
      variant: 'success',
    });
    await reload();
  };

  const handleUpdateStatus = async (
    requestId: string,
    status: MedicalRequestStatus,
    note: string,
    doctorId?: string,
  ) => {
    await medicalRequestsService.updateStatus(requestId, status, user?.name ?? 'Usuario', note, doctorId);
    await auditService.record({
      userId: user?.id ?? 'usr-001',
      userName: user?.name ?? 'Usuario',
      userRole: user?.role,
      action: status === 'aprobada' ? 'aprobar' : status === 'rechazada' ? 'rechazar' : 'editar',
      module: 'Solicitudes médicas',
      entity: 'MedicalRequest',
      entityId: requestId,
      description: `Actualizó seguimiento de ${requestId} a estado "${MEDICAL_REQUEST_STATUS_META[status].label}".`,
    });
    toast({
      title: 'Seguimiento actualizado',
      description: `La solicitud pasó a estado "${MEDICAL_REQUEST_STATUS_META[status].label}".`,
      variant: 'success',
    });
    await reload();
  };

  if (loading || !data) return <PageLoader />;

  const counts = {
    pendiente: data.requests.filter((r) => r.status === 'pendiente').length,
    en_revision: data.requests.filter((r) => r.status === 'en_revision').length,
    aprobada: data.requests.filter((r) => r.status === 'aprobada').length,
    entregada: data.requests.filter((r) => r.status === 'entregada').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes médicas"
        description="Seguimiento administrativo de recetas, órdenes de estudio, certificados y autorizaciones."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Nueva solicitud
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pendientes" value={counts.pendiente} icon={Clock} tone="amber" hint="esperando derivación" />
        <StatCard label="En revisión" value={counts.en_revision} icon={ClipboardList} hint="en evaluación profesional" />
        <StatCard label="Aprobadas" value={counts.aprobada} icon={CheckCircle2} tone="accent" hint="listas para entrega" />
        <StatCard label="Entregadas" value={counts.entregada} icon={FileCheck2} hint="completadas al paciente" />
      </div>

      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Buscar paciente, DNI o detalle…"
            leftIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="Todos los tipos"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={(Object.keys(MEDICAL_REQUEST_TYPE_META) as MedicalRequestType[]).map((k) => ({
              value: k,
              label: MEDICAL_REQUEST_TYPE_META[k].label,
            }))}
          />
          <Select
            placeholder="Todos los estados"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={(Object.keys(MEDICAL_REQUEST_STATUS_META) as MedicalRequestStatus[]).map((k) => ({
              value: k,
              label: MEDICAL_REQUEST_STATUS_META[k].label,
            }))}
          />
          <Select
            placeholder="Todos los médicos"
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            options={data.doctors.map((d) => ({ value: d.id, label: `${d.title} ${d.lastName}` }))}
          />
        </CardContent>
        {hasFilters && (
          <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-xs text-slate-500">
            <span>{filtered.length} solicitud(es) encontradas</span>
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

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Sin solicitudes coincidentes"
            description="Ajustá los filtros o registrá una nueva solicitud médica."
            action={
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <TableContainer>
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-line bg-surface/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Solicitud / Detalle</th>
                  <th className="px-5 py-3">Paciente</th>
                  <th className="px-5 py-3">Médico responsable</th>
                  <th className="px-5 py-3">Fecha / Canal</th>
                  <th className="px-5 py-3">Prioridad</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Seguimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((req) => {
                  const patient = patientMap.get(req.patientId);
                  const doctor = req.doctorId ? doctorMap.get(req.doctorId) : undefined;
                  const typeMeta = MEDICAL_REQUEST_TYPE_META[req.type];
                  const statusMeta = MEDICAL_REQUEST_STATUS_META[req.status];
                  const priorityMeta = PRIORITY_META[req.priority];
                  const channelMeta = CHANNEL_META[req.channel];

                  return (
                    <tr key={req.id} className="transition hover:bg-surface/50">
                      <td className="max-w-[280px] px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                          <span className="text-xs font-medium text-slate-400">{req.id.toUpperCase()}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600">{req.description}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {patient ? `${patient.lastName}, ${patient.firstName}` : 'Paciente'}
                            </p>
                            <p className="text-xs text-slate-500">DNI {patient?.dni ?? '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">
                        {doctor ? `${doctor.title} ${doctor.lastName}` : 'Sin asignar'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs">
                        <p className="font-medium text-slate-700">{formatDateTime(req.createdAt)} hs</p>
                        <div className="mt-1">
                          <Badge variant={channelMeta.variant}>{channelMeta.label}</Badge>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge variant={priorityMeta.variant}>{priorityMeta.label}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge variant={statusMeta.variant} dot>
                          {statusMeta.label}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="h-3.5 w-3.5" />}
                          onClick={() => setSelectedId(req.id)}
                        >
                          Ver historial
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

      <MedicalRequestFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        patients={data.patients}
        doctors={data.doctors}
        onSubmit={handleCreate}
      />

      <MedicalRequestDetailDrawer
        request={selectedRequest}
        patient={selectedRequest ? patientMap.get(selectedRequest.patientId) : undefined}
        doctors={data.doctors}
        onClose={() => setSelectedId(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
