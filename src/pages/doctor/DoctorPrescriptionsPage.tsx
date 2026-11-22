import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, HelpCircle, Pill, Search, XCircle } from 'lucide-react';
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
import { CHANNEL_META, MEDICAL_REQUEST_STATUS_META, PRIORITY_META } from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { ClinicalResponsibilityNotice } from '@/features/doctor/ClinicalScopeBanner';
import { DocumentPreviewModal } from '@/features/doctor/DocumentPreviewModal';
import { PrescriptionReviewDrawer } from '@/features/doctor/PrescriptionReviewDrawer';
import { useAsync } from '@/hooks/useAsync';
import {
  auditService,
  catalogService,
  doctorPortalService,
  documentsService,
  medicalRequestsService,
  patientHistoryService,
  patientsService,
} from '@/services';
import type { ClinicalDocument, MedicalRequest, MedicalRequestStatus } from '@/types';
import { formatDateTime, formatDNI } from '@/utils/format';

export default function DoctorPrescriptionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const doctorId = user?.doctorId;

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<MedicalRequest | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ClinicalDocument | null>(null);

  const { data, loading, reload } = useAsync(async () => {
    const [allPatients, allRequests, allDocs, allHistory, coverages] = await Promise.all([
      patientsService.list(),
      medicalRequestsService.list(),
      documentsService.listAll(),
      patientHistoryService.listAll(),
      catalogService.listCoverages(),
    ]);

    const myPatients = doctorPortalService.filterAuthorizedPatients(allPatients, doctorId);
    const authorizedIds = new Set(myPatients.map((p) => p.id));

    return {
      myPatients,
      prescriptions: allRequests
        .filter((r) => r.type === 'receta' && r.doctorId === doctorId && authorizedIds.has(r.patientId))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      documents: allDocs.filter((d) => authorizedIds.has(d.patientId)),
      history: allHistory.filter((h) => authorizedIds.has(h.patientId)),
      coverages,
    };
  }, [doctorId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const patientsById = new Map(data.myPatients.map((p) => [p.id, p]));
    const q = query.trim().toLowerCase();

    return data.prescriptions.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (!q) return true;
      const p = patientsById.get(req.patientId);
      const med = req.medicationDetails;
      const haystack = [
        req.id,
        req.description,
        med?.declaredMedication,
        med?.reason,
        p ? `${p.firstName} ${p.lastName} ${p.dni}` : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, query, statusFilter]);

  const handleResolve = async (id: string, status: MedicalRequestStatus, note: string) => {
    const actor = user?.name ?? 'Profesional';
    await medicalRequestsService.updateStatus(id, status, actor, note, doctorId);

    const auditAction =
      status === 'aprobada' ? 'aprobar' : status === 'rechazada' ? 'rechazar' : 'editar';
    await auditService.record({
      userId: user?.id ?? 'usr-002',
      userName: actor,
      userRole: 'medico',
      action: auditAction,
      module: 'Panel Médico · Recetas',
      entity: 'MedicalRequest',
      entityId: id,
      description: `Intervención profesional en receta ${id}: ${MEDICAL_REQUEST_STATUS_META[status].label}.`,
    });

    toast({
      title: `Solicitud ${MEDICAL_REQUEST_STATUS_META[status].label.toLowerCase()}`,
      description: 'Tu intervención profesional quedó registrada en el historial de la solicitud.',
      variant: status === 'rechazada' ? 'warning' : 'success',
    });
    await reload();
  };

  if (loading || !data) {
    return <PageLoader />;
  }

  const patientsById = new Map(data.myPatients.map((p) => [p.id, p]));
  const coveragesById = new Map(data.coverages.map((c) => [c.id, c]));

  const counts = {
    pendientes: data.prescriptions.filter((r) => r.status === 'pendiente' || r.status === 'en_revision').length,
    info: data.prescriptions.filter((r) => r.status === 'info_solicitada').length,
    aprobadas: data.prescriptions.filter((r) => r.status === 'aprobada' || r.status === 'entregada').length,
    rechazadas: data.prescriptions.filter((r) => r.status === 'rechazada').length,
  };

  const selectedPatient = selectedRequest ? patientsById.get(selectedRequest.patientId) : undefined;
  const selectedCoverage = selectedPatient ? coveragesById.get(selectedPatient.coverage.coverageId) : undefined;
  const selectedDocs = selectedRequest ? data.documents.filter((d) => d.patientId === selectedRequest.patientId) : [];
  const selectedHistory = selectedRequest ? data.history.filter((h) => h.patientId === selectedRequest.patientId) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes de recetas"
        description="Revisá la medicación declarada por el paciente, su documentación y antecedentes antes de aprobar, rechazar o solicitar información adicional."
      />

      <ClinicalResponsibilityNotice />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pendientes / en revisión"
          value={counts.pendientes}
          icon={Clock}
          tone="amber"
          hint="Requieren tu evaluación"
        />
        <StatCard
          label="Información solicitada"
          value={counts.info}
          icon={HelpCircle}
          tone="primary"
          hint="A la espera de respuesta"
        />
        <StatCard
          label="Aprobadas / entregadas"
          value={counts.aprobadas}
          icon={CheckCircle2}
          tone="accent"
          hint="Con intervención profesional"
        />
        <StatCard
          label="Rechazadas"
          value={counts.rechazadas}
          icon={XCircle}
          tone="rose"
          hint="Con devolución registrada"
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-3 py-4 sm:grid-cols-12">
          <div className="relative sm:col-span-8">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por paciente, DNI, medicamento declarado o motivo..."
              className="pl-9"
              aria-label="Buscar solicitudes de recetas"
            />
          </div>
          <div className="sm:col-span-4">
            <Select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todos los estados' },
                ...(Object.keys(MEDICAL_REQUEST_STATUS_META) as MedicalRequestStatus[]).map((k) => ({
                  value: k,
                  label: MEDICAL_REQUEST_STATUS_META[k].label,
                })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="Sin solicitudes de recetas"
            description="No hay solicitudes asignadas a tu perfil que coincidan con los filtros."
          />
        ) : (
          <TableContainer>
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Paciente</th>
                  <th className="px-4 py-3">Medicación declarada</th>
                  <th className="px-4 py-3">Dosis y frecuencia</th>
                  <th className="px-4 py-3">Prioridad / Canal</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Revisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((req) => {
                  const patient = patientsById.get(req.patientId);
                  const statusMeta = MEDICAL_REQUEST_STATUS_META[req.status];
                  const priorityMeta = PRIORITY_META[req.priority];
                  const channelMeta = CHANNEL_META[req.channel];
                  const med = req.medicationDetails;

                  return (
                    <tr key={req.id} className="transition hover:bg-surface/60">
                      <td className="px-5 py-3.5">
                        {patient ? (
                          <div className="flex items-center gap-2.5">
                            <Avatar name={`${patient.firstName} ${patient.lastName}`} size="sm" />
                            <div>
                              <Link
                                to={`/medico/pacientes/${patient.id}`}
                                className="font-semibold text-slate-900 hover:text-primary-700 hover:underline"
                              >
                                {patient.firstName} {patient.lastName}
                              </Link>
                              <p className="text-xs text-slate-500">DNI {formatDNI(patient.dni)}</p>
                            </div>
                          </div>
                        ) : (
                          'Paciente'
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-3.5">
                        <p className="truncate font-medium text-slate-900">
                          {med?.declaredMedication ?? 'Medicación no detallada'}
                        </p>
                        <p className="truncate text-xs text-slate-500">{med?.reason ?? req.description}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <p className="font-medium text-slate-800">{med?.dose ?? '—'}</p>
                        <p className="text-slate-500">{med?.frequency ?? 'Ver detalle'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={priorityMeta.variant}>{priorityMeta.label}</Badge>
                          <Badge variant={channelMeta.variant}>{channelMeta.label}</Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(req.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={statusMeta.variant} dot>
                          {statusMeta.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant={req.status === 'pendiente' || req.status === 'en_revision' ? 'primary' : 'outline'}
                          onClick={() => setSelectedRequest(req)}
                        >
                          Revisar
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

      <PrescriptionReviewDrawer
        request={selectedRequest}
        patient={selectedPatient}
        coverage={selectedCoverage}
        documents={selectedDocs}
        history={selectedHistory}
        onClose={() => setSelectedRequest(null)}
        onPreviewDocument={setPreviewDoc}
        onResolve={handleResolve}
      />

      <DocumentPreviewModal
        document={previewDoc}
        patient={previewDoc ? patientsById.get(previewDoc.patientId) : undefined}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
