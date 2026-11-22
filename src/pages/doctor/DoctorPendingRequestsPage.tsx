import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  HelpCircle,
  ListTodo,
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
  Drawer,
  EmptyState,
  Field,
  Input,
  PageLoader,
  Select,
  Textarea,
} from '@/components/ui';
import {
  CHANNEL_META,
  MEDICAL_REQUEST_STATUS_META,
  MEDICAL_REQUEST_TYPE_META,
  PRIORITY_META,
} from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { ClinicalResponsibilityNotice, DomainTag } from '@/features/doctor/ClinicalScopeBanner';
import { DocumentPreviewModal } from '@/features/doctor/DocumentPreviewModal';
import { PrescriptionReviewDrawer } from '@/features/doctor/PrescriptionReviewDrawer';
import { useAsync } from '@/hooks/useAsync';
import {
  catalogService,
  doctorPortalService,
  documentsService,
  medicalRequestsService,
  patientHistoryService,
  patientsService,
} from '@/services';
import type { ClinicalDocument, MedicalRequest, MedicalRequestStatus, MedicalRequestType } from '@/types';
import { formatDateTime, formatDNI } from '@/utils/format';

export default function DoctorPendingRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const doctorId = user?.doctorId;

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<MedicalRequest | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ClinicalDocument | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [saving, setSaving] = useState<MedicalRequestStatus | null>(null);

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
      myRequests: allRequests
        .filter((r) => r.doctorId === doctorId && authorizedIds.has(r.patientId))
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

    return data.myRequests.filter((req) => {
      const isPending = ['pendiente', 'en_revision', 'info_solicitada'].includes(req.status);
      if (!showResolved && !isPending) return false;
      if (typeFilter !== 'all' && req.type !== typeFilter) return false;
      if (priorityFilter !== 'all' && req.priority !== priorityFilter) return false;
      if (!q) return true;
      const p = patientsById.get(req.patientId);
      const text = `${req.id} ${req.description} ${p ? `${p.firstName} ${p.lastName} ${p.dni}` : ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [data, query, typeFilter, priorityFilter, showResolved]);

  const handleResolve = async (id: string, status: MedicalRequestStatus, note: string) => {
    setSaving(status);
    try {
      await medicalRequestsService.updateStatus(id, status, user?.name ?? 'Profesional', note, doctorId);
      toast({
        title: `Tarea actualizada a "${MEDICAL_REQUEST_STATUS_META[status].label}"`,
        description: 'Se registró la intervención profesional en la bandeja.',
        variant: status === 'rechazada' ? 'warning' : 'success',
      });
      setSelectedRequest(null);
      setResolutionNote('');
      await reload();
    } finally {
      setSaving(null);
    }
  };

  if (loading || !data) {
    return <PageLoader />;
  }

  const patientsById = new Map(data.myPatients.map((p) => [p.id, p]));
  const coveragesById = new Map(data.coverages.map((c) => [c.id, c]));

  const isPrescriptionDrawer = selectedRequest?.type === 'receta';
  const selectedPatient = selectedRequest ? patientsById.get(selectedRequest.patientId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes pendientes"
        description="Bandeja unificada de tareas asignadas a tu perfil: recetas, órdenes de estudio, informes, certificados y autorizaciones."
        actions={
          <Button
            variant={showResolved ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowResolved((v) => !v)}
          >
            {showResolved ? 'Mostrando todas' : 'Incluir resueltas'}
          </Button>
        }
      />

      <ClinicalResponsibilityNotice compact />

      <Card>
        <CardContent className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative lg:col-span-6">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por paciente, DNI o descripción..."
              className="pl-9"
              aria-label="Buscar solicitudes pendientes"
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              aria-label="Filtrar por tipo"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todos los tipos' },
                ...(Object.keys(MEDICAL_REQUEST_TYPE_META) as MedicalRequestType[]).map((k) => ({
                  value: k,
                  label: MEDICAL_REQUEST_TYPE_META[k].label,
                })),
              ]}
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              aria-label="Filtrar por prioridad"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todas las prioridades' },
                { value: 'alta', label: 'Prioridad alta' },
                { value: 'media', label: 'Prioridad media' },
                { value: 'baja', label: 'Prioridad baja' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListTodo}
            title="Tu bandeja está al día"
            description="No hay solicitudes pendientes asignadas con los filtros seleccionados."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((req) => {
            const patient = patientsById.get(req.patientId);
            const typeMeta = MEDICAL_REQUEST_TYPE_META[req.type];
            const statusMeta = MEDICAL_REQUEST_STATUS_META[req.status];
            const priorityMeta = PRIORITY_META[req.priority];
            const channelMeta = CHANNEL_META[req.channel];
            const domain = req.type === 'certificado' || req.type === 'autorizacion' ? 'administrativo' : 'clinico';

            return (
              <Card key={req.id} className="flex flex-col justify-between transition hover:shadow-card-hover">
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                      <Badge variant={statusMeta.variant} dot>
                        {statusMeta.label}
                      </Badge>
                      <Badge variant={priorityMeta.variant}>Prioridad {priorityMeta.label.toLowerCase()}</Badge>
                    </div>
                    <DomainTag domain={domain} />
                  </div>

                  {patient && (
                    <div className="flex items-center gap-2.5">
                      <Avatar name={`${patient.firstName} ${patient.lastName}`} size="sm" />
                      <div>
                        <Link
                          to={`/medico/pacientes/${patient.id}`}
                          className="text-sm font-semibold text-slate-900 hover:text-primary-700 hover:underline"
                        >
                          {patient.firstName} {patient.lastName}
                        </Link>
                        <p className="text-xs text-slate-500">
                          DNI {formatDNI(patient.dni)} · Canal {channelMeta.label}
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-slate-700">
                    {req.medicationDetails?.declaredMedication
                      ? `${req.medicationDetails.declaredMedication} — ${req.medicationDetails.reason}`
                      : req.description}
                  </p>

                  {req.resolutionNotes && (
                    <p className="rounded-lg bg-surface px-3 py-2 text-xs text-slate-600">
                      <strong>Última nota:</strong> {req.resolutionNotes}
                    </p>
                  )}
                </CardContent>

                <div className="flex items-center justify-between border-t border-line px-5 py-3">
                  <span className="text-xs text-slate-400">Actualizada {formatDateTime(req.updatedAt)}</span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setSelectedRequest(req);
                      setResolutionNote(req.resolutionNotes ?? '');
                    }}
                  >
                    Gestionar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Si es receta, reutilizamos el PrescriptionReviewDrawer */}
      <PrescriptionReviewDrawer
        request={isPrescriptionDrawer ? selectedRequest : null}
        patient={isPrescriptionDrawer ? selectedPatient : undefined}
        coverage={
          isPrescriptionDrawer && selectedPatient
            ? coveragesById.get(selectedPatient.coverage.coverageId)
            : undefined
        }
        documents={
          isPrescriptionDrawer && selectedRequest
            ? data.documents.filter((d) => d.patientId === selectedRequest.patientId)
            : []
        }
        history={
          isPrescriptionDrawer && selectedRequest
            ? data.history.filter((h) => h.patientId === selectedRequest.patientId)
            : []
        }
        onClose={() => setSelectedRequest(null)}
        onPreviewDocument={setPreviewDoc}
        onResolve={handleResolve}
      />

      {/* Drawer genérico para órdenes de estudio, informes, certificados y autorizaciones */}
      <Drawer
        open={Boolean(selectedRequest && !isPrescriptionDrawer)}
        onClose={() => setSelectedRequest(null)}
        title={
          selectedRequest
            ? `${MEDICAL_REQUEST_TYPE_META[selectedRequest.type].label} · ${selectedRequest.id.toUpperCase()}`
            : 'Gestión de solicitud'
        }
        description={
          selectedPatient
            ? `${selectedPatient.firstName} ${selectedPatient.lastName} · DNI ${formatDNI(selectedPatient.dni)}`
            : undefined
        }
        footer={
          selectedRequest && (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <Button variant="outline" onClick={() => setSelectedRequest(null)} disabled={Boolean(saving)}>
                Cerrar
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  loading={saving === 'info_solicitada'}
                  disabled={Boolean(saving)}
                  leftIcon={<HelpCircle className="h-4 w-4 text-amber-600" />}
                  onClick={() =>
                    void handleResolve(
                      selectedRequest.id,
                      'info_solicitada',
                      resolutionNote.trim() || 'Se solicita documentación complementaria al paciente.',
                    )
                  }
                >
                  Solicitar info
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={saving === 'rechazada'}
                  disabled={Boolean(saving)}
                  leftIcon={<XCircle className="h-4 w-4" />}
                  onClick={() =>
                    void handleResolve(
                      selectedRequest.id,
                      'rechazada',
                      resolutionNote.trim() || 'Rechazada por criterio profesional; requiere control presencial.',
                    )
                  }
                >
                  Rechazar
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  loading={saving === 'aprobada'}
                  disabled={Boolean(saving)}
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() =>
                    void handleResolve(
                      selectedRequest.id,
                      'aprobada',
                      resolutionNote.trim() || 'Aprobada mediante intervención profesional.',
                    )
                  }
                >
                  Aprobar
                </Button>
              </div>
            </div>
          )
        }
      >
        {selectedRequest && !isPrescriptionDrawer && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={MEDICAL_REQUEST_STATUS_META[selectedRequest.status].variant} dot>
                  {MEDICAL_REQUEST_STATUS_META[selectedRequest.status].label}
                </Badge>
                <Badge variant={PRIORITY_META[selectedRequest.priority].variant}>
                  Prioridad {PRIORITY_META[selectedRequest.priority].label.toLowerCase()}
                </Badge>
              </div>
              {selectedPatient && (
                <Link
                  to={`/medico/pacientes/${selectedPatient.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
                >
                  Abrir ficha
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <ClipboardList className="h-3.5 w-3.5 text-primary-600" />
                Detalle de la solicitud
              </p>
              <p className="mt-2 text-sm text-slate-800">{selectedRequest.description}</p>
            </div>

            <Field id="pending-req-note" label="Observación profesional">
              <Textarea
                id="pending-req-note"
                rows={4}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Registrá una indicación o devolución para el paciente o recepción..."
              />
            </Field>
          </div>
        )}
      </Drawer>

      <DocumentPreviewModal
        document={previewDoc}
        patient={previewDoc ? patientsById.get(previewDoc.patientId) : undefined}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
