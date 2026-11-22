import { useEffect, useState, type FormEvent } from 'react';
import { Button, Modal, Select, Textarea } from '@/components/ui';
import { CHANNEL_META, MEDICAL_REQUEST_TYPE_META, PRIORITY_META } from '@/config/status';
import type { MedicalRequestPayload } from '@/services/medicalRequestsService';
import type { Channel, Doctor, MedicalRequestType, Patient, Priority } from '@/types';

interface MedicalRequestFormModalProps {
  open: boolean;
  onClose: () => void;
  patients: Patient[];
  doctors: Doctor[];
  onSubmit: (payload: MedicalRequestPayload) => Promise<void>;
}

export function MedicalRequestFormModal({ open, onClose, patients, doctors, onSubmit }: MedicalRequestFormModalProps) {
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [type, setType] = useState<MedicalRequestType>('receta');
  const [priority, setPriority] = useState<Priority>('media');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setPatientId(patients[0]?.id ?? '');
    setDoctorId(patients[0]?.assignedDoctorId ?? doctors.find((d) => d.active)?.id ?? '');
    setType('receta');
    setPriority('media');
    setChannel('whatsapp');
    setDescription('');
  }, [open, patients, doctors]);

  const handlePatientChange = (nextPatientId: string) => {
    setPatientId(nextPatientId);
    const p = patients.find((item) => item.id === nextPatientId);
    if (p?.assignedDoctorId) setDoctorId(p.assignedDoctorId);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!patientId) {
      setError('Seleccioná un paciente.');
      return;
    }
    if (!description.trim()) {
      setError('Describí el detalle de la solicitud.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        patientId,
        doctorId: doctorId || undefined,
        type,
        priority,
        channel,
        status: 'pendiente',
        description: description.trim(),
      });
      onClose();
    } catch {
      setError('No se pudo registrar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Registrar solicitud médica"
      description="Ingresá una solicitud de receta o documentación para seguimiento y derivación al profesional."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="request-form" loading={submitting}>
            Registrar solicitud
          </Button>
        </>
      }
    >
      <form id="request-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        )}

        <Select
          label="Paciente"
          required
          value={patientId}
          onChange={(e) => handlePatientChange(e.target.value)}
          options={patients.map((p) => ({ value: p.id, label: `${p.lastName}, ${p.firstName} (DNI ${p.dni})` }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Tipo de solicitud"
            value={type}
            onChange={(e) => setType(e.target.value as MedicalRequestType)}
            options={(Object.keys(MEDICAL_REQUEST_TYPE_META) as MedicalRequestType[]).map((k) => ({
              value: k,
              label: MEDICAL_REQUEST_TYPE_META[k].label,
            }))}
          />
          <Select
            label="Médico responsable"
            placeholder="Sin asignar"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            options={doctors.filter((d) => d.active).map((d) => ({ value: d.id, label: `${d.title} ${d.firstName} ${d.lastName}` }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Prioridad"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            options={(Object.keys(PRIORITY_META) as Priority[]).map((k) => ({
              value: k,
              label: PRIORITY_META[k].label,
            }))}
          />
          <Select
            label="Canal de ingreso"
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
            options={(Object.keys(CHANNEL_META) as Channel[]).map((k) => ({
              value: k,
              label: CHANNEL_META[k].label,
            }))}
          />
        </div>

        <Textarea
          label="Detalle de la solicitud"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej. Renovación de receta mensual, certificado de asistencia, orden de laboratorio…"
        />
      </form>
    </Modal>
  );
}
