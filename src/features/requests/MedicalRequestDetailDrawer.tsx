import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ExternalLink, ShieldCheck } from 'lucide-react';
import { Badge, Button, Drawer, Select, Textarea } from '@/components/ui';
import {
  CHANNEL_META,
  MEDICAL_REQUEST_STATUS_META,
  MEDICAL_REQUEST_TYPE_META,
  PRIORITY_META,
} from '@/config/status';
import type { Doctor, MedicalRequest, MedicalRequestStatus, Patient } from '@/types';
import { formatDateTime, formatDNI } from '@/utils/format';

interface MedicalRequestDetailDrawerProps {
  request: MedicalRequest | null;
  patient?: Patient;
  doctors: Doctor[];
  onClose: () => void;
  onUpdateStatus: (
    requestId: string,
    status: MedicalRequestStatus,
    note: string,
    doctorId?: string,
  ) => Promise<void>;
}

export function MedicalRequestDetailDrawer({
  request,
  patient,
  doctors,
  onClose,
  onUpdateStatus,
}: MedicalRequestDetailDrawerProps) {
  const [status, setStatus] = useState<MedicalRequestStatus>('pendiente');
  const [doctorId, setDoctorId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!request) return;
    setStatus(request.status);
    setDoctorId(request.doctorId ?? '');
    setNote('');
  }, [request]);

  if (!request) return null;

  const typeMeta = MEDICAL_REQUEST_TYPE_META[request.type];
  const statusMeta = MEDICAL_REQUEST_STATUS_META[request.status];
  const priorityMeta = PRIORITY_META[request.priority];
  const channelMeta = CHANNEL_META[request.channel];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateStatus(request.id, status, note, doctorId);
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={Boolean(request)}
      onClose={onClose}
      title={`Solicitud ${request.id.toUpperCase()}`}
      description={`Ingresada el ${formatDateTime(request.createdAt)} hs`}
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Actualizar seguimiento
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
          <Badge variant={statusMeta.variant} dot>
            {statusMeta.label}
          </Badge>
          <Badge variant={priorityMeta.variant}>Prioridad {priorityMeta.label}</Badge>
          <Badge variant={channelMeta.variant}>{channelMeta.label}</Badge>
        </div>

        {/* Paciente */}
        <div className="rounded-xl border border-line bg-surface/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paciente</p>
          {patient ? (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">
                  {patient.lastName}, {patient.firstName}
                </p>
                <p className="text-xs text-slate-500">DNI {formatDNI(patient.dni)}</p>
              </div>
              <Link
                to={`/admin/pacientes/${patient.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
              >
                Ver ficha <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-600">Paciente no encontrado</p>
          )}
        </div>

        {/* Descripción */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Descripción</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{request.description}</p>
          {request.resolutionNotes && (
            <div className="mt-3 rounded-lg border border-primary-100 bg-primary-50/50 p-3 text-xs text-primary-900">
              <span className="font-semibold">Última nota de resolución:</span> {request.resolutionNotes}
            </div>
          )}
        </div>

        {/* Gestión administrativa */}
        <div className="space-y-3 rounded-xl border border-line p-4">
          <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" />
            <span>
              Desde el Panel Administrativo se gestiona el seguimiento, derivación y entrega. La firma clínica
              corresponde al profesional en el Panel Médico.
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Estado de seguimiento"
              value={status}
              onChange={(e) => setStatus(e.target.value as MedicalRequestStatus)}
              options={(Object.keys(MEDICAL_REQUEST_STATUS_META) as MedicalRequestStatus[]).map((k) => ({
                value: k,
                label: MEDICAL_REQUEST_STATUS_META[k].label,
              }))}
            />
            <Select
              label="Médico responsable"
              placeholder="Sin asignar"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              options={doctors.map((d) => ({ value: d.id, label: `${d.title} ${d.lastName}` }))}
            />
          </div>

          <Textarea
            label="Agregar nota de seguimiento (opcional)"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej. Se notificó al paciente para retiro por recepción…"
          />
        </div>

        {/* Historial cronológico */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Historial de movimientos</p>
          <ol className="space-y-3 border-l-2 border-line pl-4">
            {(request.history ?? []).map((item) => (
              <li key={item.id} className="relative text-xs">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary-600" />
                <p className="font-semibold text-slate-800">{item.action}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-slate-500">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(item.date)} hs · {item.actor}
                </p>
                {item.note && <p className="mt-1 text-slate-600">{item.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Drawer>
  );
}
