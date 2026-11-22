import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui';
import { APPOINTMENT_TYPE_LABELS, CHANNEL_META } from '@/config/status';
import type { AppointmentPayload } from '@/services/appointmentsService';
import type { Appointment, AppointmentType, Channel, Doctor, Patient, Specialty } from '@/types';
import { addMinutesToTime, combineDateAndTime, toDateKey } from '@/utils/date';
import { formatDNI, formatTime } from '@/utils/format';

interface AppointmentFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Si se pasa un turno existente, el modal funciona en modo Reprogramación. */
  appointment?: Appointment | null;
  /** Preselección opcional de paciente (ej. desde Perfil del paciente). */
  defaultPatientId?: string;
  /** Preselección opcional de médico o fecha (ej. desde Agenda médica). */
  defaultDoctorId?: string;
  defaultDateKey?: string;
  patients: Patient[];
  doctors: Doctor[];
  specialties: Specialty[];
  onSubmit: (data: {
    mode: 'create' | 'reschedule';
    appointmentId?: string;
    payload?: AppointmentPayload;
    startAt?: string;
    endAt?: string;
    notes?: string;
  }) => Promise<void>;
}

export function AppointmentFormModal({
  open,
  onClose,
  appointment,
  defaultPatientId,
  defaultDoctorId,
  defaultDateKey,
  patients,
  doctors,
  specialties,
  onSubmit,
}: AppointmentFormModalProps) {
  const isReschedule = Boolean(appointment);
  const activeDoctors = useMemo(() => doctors.filter((d) => d.active), [doctors]);

  const [patientId, setPatientId] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [dateKey, setDateKey] = useState(toDateKey(new Date()));
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(20);
  const [type, setType] = useState<AppointmentType>('control');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (appointment) {
      const start = new Date(appointment.startAt);
      const end = new Date(appointment.endAt);
      const mins = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
      setPatientId(appointment.patientId);
      setSpecialtyId(appointment.specialtyId);
      setDoctorId(appointment.doctorId);
      setDateKey(toDateKey(start));
      setTime(formatTime(start));
      setDuration(mins);
      setType(appointment.type);
      setChannel(appointment.channel);
      setNotes(appointment.notes ?? '');
    } else {
      const initialDoctor = defaultDoctorId
        ? activeDoctors.find((d) => d.id === defaultDoctorId)
        : activeDoctors[0];
      setPatientId(defaultPatientId ?? patients[0]?.id ?? '');
      setSpecialtyId(initialDoctor?.specialtyIds[0] ?? specialties[0]?.id ?? '');
      setDoctorId(initialDoctor?.id ?? '');
      setDateKey(defaultDateKey ?? toDateKey(new Date()));
      setTime('09:00');
      setDuration(initialDoctor?.schedule[0]?.slotMinutes ?? 20);
      setType('control');
      setChannel('whatsapp');
      setNotes('');
    }
  }, [open, appointment, defaultPatientId, defaultDoctorId, defaultDateKey, activeDoctors, patients, specialties]);

  const filteredDoctors = useMemo(() => {
    if (!specialtyId) return activeDoctors;
    const matching = activeDoctors.filter((d) => d.specialtyIds.includes(specialtyId));
    return matching.length > 0 ? matching : activeDoctors;
  }, [activeDoctors, specialtyId]);

  const handleSpecialtyChange = (nextSpecialtyId: string) => {
    setSpecialtyId(nextSpecialtyId);
    const matching = activeDoctors.filter((d) => d.specialtyIds.includes(nextSpecialtyId));
    if (matching.length > 0 && !matching.some((d) => d.id === doctorId)) {
      setDoctorId(matching[0].id);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!patientId || !doctorId || !specialtyId || !dateKey || !time) {
      setError('Completá todos los campos obligatorios.');
      return;
    }

    const startAt = combineDateAndTime(dateKey, time);
    const endAt = combineDateAndTime(dateKey, addMinutesToTime(time, duration));

    setSubmitting(true);
    try {
      if (isReschedule && appointment) {
        await onSubmit({
          mode: 'reschedule',
          appointmentId: appointment.id,
          startAt,
          endAt,
          notes: notes.trim() || undefined,
        });
      } else {
        await onSubmit({
          mode: 'create',
          payload: {
            patientId,
            doctorId,
            specialtyId,
            startAt,
            endAt,
            status: 'pendiente',
            type,
            channel,
            notes: notes.trim() || undefined,
          },
        });
      }
      onClose();
    } catch {
      setError('No se pudo guardar el turno. Intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isReschedule ? 'Reprogramar turno' : 'Nuevo turno'}
      description={
        isReschedule
          ? 'Seleccioná la nueva fecha y horario para el turno del paciente.'
          : 'Registrá un nuevo turno con datos ficticios de demostración.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="appointment-form" loading={submitting}>
            {isReschedule ? 'Confirmar reprogramación' : 'Crear turno'}
          </Button>
        </>
      }
    >
      <form id="appointment-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        )}

        <Select
          label="Paciente"
          required
          disabled={isReschedule}
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          options={patients.map((p) => ({
            value: p.id,
            label: `${p.lastName}, ${p.firstName} — DNI ${formatDNI(p.dni)}`,
          }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Especialidad"
            required
            disabled={isReschedule}
            value={specialtyId}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
            options={specialties.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }))}
          />
          <Select
            label="Profesional"
            required
            disabled={isReschedule}
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            options={filteredDoctors.map((d) => ({
              value: d.id,
              label: `${d.title} ${d.firstName} ${d.lastName}`,
            }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Fecha" type="date" required value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
          <Input label="Hora" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
          <Select
            label="Duración"
            value={String(duration)}
            onChange={(e) => setDuration(Number(e.target.value))}
            options={[
              { value: '20', label: '20 minutos' },
              { value: '30', label: '30 minutos' },
              { value: '40', label: '40 minutos' },
              { value: '60', label: '60 minutos' },
            ]}
          />
        </div>

        {!isReschedule && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Tipo de consulta"
              value={type}
              onChange={(e) => setType(e.target.value as AppointmentType)}
              options={(Object.keys(APPOINTMENT_TYPE_LABELS) as AppointmentType[]).map((key) => ({
                value: key,
                label: APPOINTMENT_TYPE_LABELS[key],
              }))}
            />
            <Select
              label="Canal de origen"
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
              options={(Object.keys(CHANNEL_META) as Channel[]).map((key) => ({
                value: key,
                label: CHANNEL_META[key].label,
              }))}
            />
          </div>
        )}

        <Textarea
          label="Observaciones"
          placeholder="Indicaciones administrativas, estudios a presentar o motivo de reprogramación…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </form>
    </Modal>
  );
}
