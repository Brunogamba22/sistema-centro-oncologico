import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ExternalLink, FileText, Phone, UserRound } from 'lucide-react';
import { Badge, Button, Drawer, Field, Select, Textarea } from '@/components/ui';
import {
  APPOINTMENT_STATUS_META,
  APPOINTMENT_TYPE_LABELS,
  CHANNEL_META,
} from '@/config/status';
import type { Appointment, AppointmentStatus, Coverage, Patient, Specialty } from '@/types';
import { formatDate, formatDNI, formatPhoneAR, formatTime } from '@/utils/format';
import { DomainTag } from './ClinicalScopeBanner';

interface DoctorAppointmentDrawerProps {
  appointment: Appointment | null;
  patient?: Patient;
  coverage?: Coverage;
  specialty?: Specialty;
  onClose: () => void;
  onUpdateStatus: (id: string, status: AppointmentStatus, notes?: string) => Promise<void>;
}

const DOCTOR_STATUS_OPTIONS: AppointmentStatus[] = [
  'pendiente',
  'confirmado',
  'en_espera',
  'en_atencion',
  'atendido',
  'ausente',
  'cancelado',
];

export function DoctorAppointmentDrawer({
  appointment,
  patient,
  coverage,
  specialty,
  onClose,
  onUpdateStatus,
}: DoctorAppointmentDrawerProps) {
  const [status, setStatus] = useState<AppointmentStatus>('confirmado');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (appointment) {
      setStatus(appointment.status);
      setNotes(appointment.notes ?? '');
    }
  }, [appointment]);

  if (!appointment) return null;

  const statusMeta = APPOINTMENT_STATUS_META[appointment.status];
  const channelMeta = CHANNEL_META[appointment.channel];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateStatus(appointment.id, status, notes.trim() || undefined);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={Boolean(appointment)}
      onClose={onClose}
      title={patient ? `${patient.firstName} ${patient.lastName}` : 'Detalle del turno'}
      description={`${formatDate(appointment.startAt)} · ${formatTime(appointment.startAt)} a ${formatTime(appointment.endAt)} hs`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
          <Button variant="primary" loading={saving} onClick={handleSave}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusMeta.variant} dot>
              {statusMeta.label}
            </Badge>
            <Badge variant="neutral">{APPOINTMENT_TYPE_LABELS[appointment.type]}</Badge>
            <Badge variant={channelMeta.variant}>{channelMeta.label}</Badge>
          </div>
          {patient && (
            <Link
              to={`/medico/pacientes/${patient.id}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800 hover:underline"
            >
              Abrir ficha del paciente
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Sección administrativa */}
        <section className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Datos del turno y cobertura</h3>
            <DomainTag domain="administrativo" />
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-500">Fecha</dt>
                <dd className="font-medium text-slate-900">{formatDate(appointment.startAt)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-500">Horario</dt>
                <dd className="font-medium text-slate-900">
                  {formatTime(appointment.startAt)} - {formatTime(appointment.endAt)} hs
                </dd>
              </div>
            </div>
            {patient && (
              <>
                <div className="flex items-start gap-2">
                  <UserRound className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-500">DNI</dt>
                    <dd className="font-medium text-slate-900">{formatDNI(patient.dni)}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-500">Teléfono</dt>
                    <dd className="font-medium text-slate-900">{formatPhoneAR(patient.phone)}</dd>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Cobertura médica</dt>
                  <dd className="font-medium text-slate-900">
                    {coverage ? `${coverage.name}${patient.coverage.plan ? ` · Plan ${patient.coverage.plan}` : ''}` : 'Sin especificar'}
                    {' · '}
                    <span className="font-normal text-slate-600">Afiliado {patient.coverage.affiliateNumber}</span>
                  </dd>
                </div>
              </>
            )}
            {specialty && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Especialidad</dt>
                <dd className="font-medium text-slate-900">{specialty.name}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Gestión de atención */}
        <section className="space-y-4 rounded-xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <FileText className="h-3.5 w-3.5 text-accent-600" />
              Seguimiento de la atención
            </h3>
            <DomainTag domain="clinico" />
          </div>

          <Field id="doc-apt-status" label="Estado del turno">
            <Select
              id="doc-apt-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
              options={DOCTOR_STATUS_OPTIONS.map((key) => ({
                value: key,
                label: APPOINTMENT_STATUS_META[key].label,
              }))}
            />
          </Field>

          <Field
            id="doc-apt-notes"
            label="Notas de seguimiento"
            hint="Observaciones operativas o recordatorios para la consulta (sin diagnóstico automático)."
          >
            <Textarea
              id="doc-apt-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej.: Revisar laboratorio enviado por WhatsApp, verificar tolerancia al ciclo..."
            />
          </Field>
        </section>
      </div>
    </Drawer>
  );
}
