import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Clock, ExternalLink, Stethoscope, User, XCircle } from 'lucide-react';
import { Badge, Button, Drawer } from '@/components/ui';
import { APPOINTMENT_STATUS_META, APPOINTMENT_TYPE_LABELS, CHANNEL_META } from '@/config/status';
import type { Appointment, AppointmentStatus, Coverage, Doctor, Patient, Specialty } from '@/types';
import { formatDate, formatDNI, formatPhoneAR, formatTime } from '@/utils/format';

interface AppointmentDetailDrawerProps {
  appointment: Appointment | null;
  onClose: () => void;
  patient?: Patient;
  doctor?: Doctor;
  specialty?: Specialty;
  coverage?: Coverage;
  onReschedule: (appointment: Appointment) => void;
  onChangeStatus: (appointment: Appointment, status: AppointmentStatus) => void;
}

export function AppointmentDetailDrawer({
  appointment,
  onClose,
  patient,
  doctor,
  specialty,
  coverage,
  onReschedule,
  onChangeStatus,
}: AppointmentDetailDrawerProps) {
  if (!appointment) return null;

  const statusMeta = APPOINTMENT_STATUS_META[appointment.status];
  const channelMeta = CHANNEL_META[appointment.channel];
  const canModify = !['cancelado', 'atendido'].includes(appointment.status);

  return (
    <Drawer
      open={Boolean(appointment)}
      onClose={onClose}
      title="Detalle del turno"
      description={`Código ${appointment.id.toUpperCase()} · ${formatDate(appointment.startAt)}`}
      footer={
        <>
          {canModify && appointment.status !== 'confirmado' && (
            <Button
              variant="accent"
              size="sm"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => onChangeStatus(appointment, 'confirmado')}
            >
              Confirmar
            </Button>
          )}
          {canModify && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CalendarClock className="h-4 w-4" />}
              onClick={() => onReschedule(appointment)}
            >
              Reprogramar
            </Button>
          )}
          {canModify && (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<XCircle className="h-4 w-4" />}
              onClick={() => onChangeStatus(appointment, 'cancelado')}
            >
              Cancelar turno
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusMeta.variant} dot>
            {statusMeta.label}
          </Badge>
          <Badge variant={channelMeta.variant}>{channelMeta.label}</Badge>
          <Badge variant="neutral">{APPOINTMENT_TYPE_LABELS[appointment.type]}</Badge>
        </div>

        <section className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Clock className="h-4 w-4 text-primary-600" />
            Fecha y horario
          </div>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {formatDate(appointment.startAt)} · {formatTime(appointment.startAt)} a {formatTime(appointment.endAt)} hs
          </p>
        </section>

        <section className="space-y-2 rounded-xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <User className="h-4 w-4 text-primary-600" />
              Paciente
            </div>
            {patient && (
              <Link
                to={`/admin/pacientes/${patient.id}`}
                onClick={onClose}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
              >
                Ver perfil <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
          {patient ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-slate-900">
                {patient.lastName}, {patient.firstName}
              </p>
              <p className="text-slate-600">DNI {formatDNI(patient.dni)}</p>
              <p className="text-slate-600">Tel: {formatPhoneAR(patient.phone)}</p>
              <p className="text-slate-600">
                Cobertura: {coverage?.name ?? 'Sin cobertura'}
                {patient.coverage.plan ? ` (${patient.coverage.plan})` : ''} · Afiliado {patient.coverage.affiliateNumber}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Paciente no disponible.</p>
          )}
        </section>

        <section className="space-y-2 rounded-xl border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Stethoscope className="h-4 w-4 text-primary-600" />
            Profesional y especialidad
          </div>
          <p className="text-sm font-semibold text-slate-900">
            {doctor ? `${doctor.title} ${doctor.firstName} ${doctor.lastName}` : 'No asignado'}
          </p>
          <p className="text-sm text-slate-600">
            {specialty?.name ?? 'Sin especialidad'} {doctor ? `· ${doctor.licenseNumber}` : ''}
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Observaciones</h3>
          <p className="rounded-xl border border-line bg-surface p-3.5 text-sm text-slate-700">
            {appointment.notes || 'Sin observaciones registradas para este turno.'}
          </p>
        </section>
      </div>
    </Drawer>
  );
}
