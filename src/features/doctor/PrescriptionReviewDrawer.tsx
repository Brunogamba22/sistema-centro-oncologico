import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  HelpCircle,
  Pill,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Drawer, Field, Textarea } from '@/components/ui';
import {
  CHANNEL_META,
  DOCUMENT_CATEGORY_META,
  HISTORY_CATEGORY_META,
  MEDICAL_REQUEST_STATUS_META,
  PRIORITY_META,
} from '@/config/status';
import type {
  ClinicalDocument,
  Coverage,
  MedicalRequest,
  MedicalRequestStatus,
  Patient,
  PatientHistoryEvent,
} from '@/types';
import { formatDate, formatDateTime, formatDNI } from '@/utils/format';
import { ClinicalResponsibilityNotice, DomainTag } from './ClinicalScopeBanner';

interface PrescriptionReviewDrawerProps {
  request: MedicalRequest | null;
  patient?: Patient;
  coverage?: Coverage;
  documents: ClinicalDocument[];
  history: PatientHistoryEvent[];
  onClose: () => void;
  onPreviewDocument: (doc: ClinicalDocument) => void;
  onResolve: (id: string, status: MedicalRequestStatus, note: string) => Promise<void>;
}

export function PrescriptionReviewDrawer({
  request,
  patient,
  coverage,
  documents,
  history,
  onClose,
  onPreviewDocument,
  onResolve,
}: PrescriptionReviewDrawerProps) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<MedicalRequestStatus | null>(null);

  useEffect(() => {
    if (request) {
      setNote(request.resolutionNotes ?? '');
      setError(null);
      setSubmitting(null);
    }
  }, [request]);

  if (!request) return null;

  const statusMeta = MEDICAL_REQUEST_STATUS_META[request.status];
  const priorityMeta = PRIORITY_META[request.priority];
  const channelMeta = CHANNEL_META[request.channel];
  const med = request.medicationDetails;

  const handleAction = async (targetStatus: MedicalRequestStatus) => {
    const trimmed = note.trim();
    if ((targetStatus === 'rechazada' || targetStatus === 'info_solicitada') && trimmed.length < 8) {
      setError(
        targetStatus === 'rechazada'
          ? 'Ingresá el motivo profesional del rechazo (mínimo 8 caracteres).'
          : 'Indicá qué información o documentación adicional necesitás solicitar (mínimo 8 caracteres).',
      );
      return;
    }
    setError(null);
    setSubmitting(targetStatus);
    try {
      const fallbackNote =
        trimmed ||
        (targetStatus === 'aprobada'
          ? 'Solicitud revisada y aprobada mediante intervención profesional.'
          : 'Actualización registrada por el profesional.');
      await onResolve(request.id, targetStatus, fallbackNote);
      onClose();
    } finally {
      setSubmitting(null);
    }
  };

  const isClosed = request.status === 'aprobada' || request.status === 'rechazada' || request.status === 'entregada';

  return (
    <Drawer
      open={Boolean(request)}
      onClose={onClose}
      width="xl"
      title={`Revisión de receta · ${request.id.toUpperCase()}`}
      description={
        patient
          ? `${patient.firstName} ${patient.lastName} · DNI ${formatDNI(patient.dni)}`
          : 'Solicitud de receta asignada'
      }
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={Boolean(submitting)}>
            Cerrar
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={submitting === 'info_solicitada'}
              disabled={Boolean(submitting)}
              leftIcon={<HelpCircle className="h-4 w-4 text-amber-600" />}
              onClick={() => handleAction('info_solicitada')}
            >
              Solicitar información
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={submitting === 'rechazada'}
              disabled={Boolean(submitting)}
              leftIcon={<XCircle className="h-4 w-4" />}
              onClick={() => handleAction('rechazada')}
            >
              Rechazar
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={submitting === 'aprobada'}
              disabled={Boolean(submitting)}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => handleAction('aprobada')}
            >
              Aprobar receta
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <ClinicalResponsibilityNotice compact />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusMeta.variant} dot>
              {statusMeta.label}
            </Badge>
            <Badge variant={priorityMeta.variant}>Prioridad {priorityMeta.label.toLowerCase()}</Badge>
            <Badge variant={channelMeta.variant}>Canal {channelMeta.label}</Badge>
          </div>
          {patient && (
            <Link
              to={`/medico/pacientes/${patient.id}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:underline"
            >
              Ver ficha completa
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Medicación declarada (Información clínica) */}
        <section className="rounded-xl border border-accent-200/80 bg-accent-50/40 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-800">
              <Pill className="h-4 w-4 text-accent-700" />
              Medicación declarada por el paciente
            </h3>
            <DomainTag domain="clinico" />
          </div>

          {med ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Medicamento declarado</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{med.declaredMedication}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Dosis declarada</dt>
                <dd className="mt-0.5 font-medium text-slate-800">{med.dose}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Frecuencia</dt>
                <dd className="mt-0.5 font-medium text-slate-800">{med.frequency}</dd>
              </div>
              {med.route && (
                <div>
                  <dt className="text-xs text-slate-500">Vía de administración</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{med.route}</dd>
                </div>
              )}
              {med.lastIssuedDate && (
                <div>
                  <dt className="text-xs text-slate-500">Última emisión registrada</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{formatDate(med.lastIssuedDate)}</dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Motivo informado</dt>
                <dd className="mt-0.5 text-slate-700">{med.reason}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-700">{request.description}</p>
          )}
        </section>

        {/* Información administrativa */}
        {patient && (
          <section className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Datos administrativos y cobertura
              </h3>
              <DomainTag domain="administrativo" />
            </div>
            <dl className="grid gap-2.5 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-slate-500">Cobertura</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {coverage ? `${coverage.name}${patient.coverage.plan ? ` (${patient.coverage.plan})` : ''}` : 'Sin dato'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">N° de afiliado</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{patient.coverage.affiliateNumber}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Ingreso de solicitud</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{formatDateTime(request.createdAt)}</dd>
              </div>
            </dl>
          </section>
        )}

        {/* Documentación disponible del paciente */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Documentación disponible ({documents.length})
            </h3>
          </div>
          {documents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-3 py-3 text-xs text-slate-500">
              No hay documentos adjuntos registrados para este paciente.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-white">
              {documents.slice(0, 4).map((doc) => {
                const cat = DOCUMENT_CATEGORY_META[doc.category];
                return (
                  <li key={doc.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileText className="h-4 w-4 shrink-0 text-primary-600" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-900">{doc.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatDate(doc.createdAt)} · {doc.uploadedBy}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={cat.variant}>{cat.label}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPreviewDocument(doc)}
                        leftIcon={<Eye className="h-3.5 w-3.5" />}
                      >
                        Ver
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Antecedentes recientes disponibles */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Antecedentes y atenciones recientes ({history.length})
          </h3>
          {history.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-3 py-3 text-xs text-slate-500">
              Sin antecedentes registrados en ficha.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.slice(0, 3).map((ev) => {
                const cat = HISTORY_CATEGORY_META[ev.category];
                return (
                  <li key={ev.id} className="rounded-lg border border-line bg-surface px-3.5 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">{ev.title}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={cat.variant}>{cat.label}</Badge>
                        <span className="text-[11px] text-slate-500">{formatDate(ev.date)}</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{ev.description}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Intervención profesional */}
        <section className="rounded-xl border border-line bg-white p-4">
          <Field
            id="rx-professional-note"
            label={isClosed ? 'Nota profesional registrada (podés actualizar la resolución)' : 'Observación / indicación profesional'}
            error={error ?? undefined}
            hint="Obligatoria para rechazar o solicitar información adicional. Queda registrada en el historial de la solicitud."
          >
            <Textarea
              id="rx-professional-note"
              rows={3}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej.: Aprobada tras revisar hemograma vigente; o solicitar último laboratorio antes de renovar..."
            />
          </Field>
        </section>

        {/* Trazabilidad */}
        {request.history && request.history.length > 0 && (
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Historial de la solicitud
            </h3>
            <ol className="space-y-2 border-l-2 border-primary-100 pl-3.5">
              {request.history.map((entry) => (
                <li key={entry.id} className="text-xs">
                  <p className="font-medium text-slate-800">{entry.action}</p>
                  <p className="text-slate-500">
                    {entry.actor} · {formatDateTime(entry.date)}
                  </p>
                  {entry.note && <p className="mt-0.5 text-slate-600">{entry.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </Drawer>
  );
}
