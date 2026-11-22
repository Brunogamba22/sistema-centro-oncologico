import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui';
import { UNAVAILABILITY_META } from '@/config/status';
import type { BlockPayload } from '@/services/agendaService';
import type { Doctor, UnavailabilityType } from '@/types';
import { toDateKey } from '@/utils/date';

interface BlockFormModalProps {
  open: boolean;
  onClose: () => void;
  doctors: Doctor[];
  defaultDoctorId?: string;
  defaultDateKey?: string;
  onSubmit: (payload: BlockPayload) => Promise<void>;
}

export function BlockFormModal({
  open,
  onClose,
  doctors,
  defaultDoctorId,
  defaultDateKey,
  onSubmit,
}: BlockFormModalProps) {
  const [doctorId, setDoctorId] = useState('');
  const [type, setType] = useState<UnavailabilityType>('bloqueo');
  const [startDate, setStartDate] = useState(toDateKey(new Date()));
  const [endDate, setEndDate] = useState(toDateKey(new Date()));
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('11:00');
  const [endTime, setEndTime] = useState('12:30');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setDoctorId(defaultDoctorId || doctors.find((d) => d.active)?.id || '');
    setType('bloqueo');
    const dk = defaultDateKey ?? toDateKey(new Date());
    setStartDate(dk);
    setEndDate(dk);
    setAllDay(false);
    setStartTime('11:00');
    setEndTime('12:30');
    setReason('');
  }, [open, defaultDoctorId, defaultDateKey, doctors]);

  const handleTypeChange = (nextType: UnavailabilityType) => {
    setType(nextType);
    if (nextType === 'vacaciones' || nextType === 'ausencia') setAllDay(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!doctorId || !startDate || !endDate || !reason.trim()) {
      setError('Completá profesional, fechas y motivo.');
      return;
    }
    if (endDate < startDate) {
      setError('La fecha de fin no puede ser anterior a la de inicio.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        doctorId,
        type,
        startDate,
        endDate,
        allDay,
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
        reason: reason.trim(),
      });
      onClose();
    } catch {
      setError('No se pudo registrar el bloqueo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar bloqueo, vacaciones o ausencia"
      description="Impacta la disponibilidad visual de la agenda médica en la demostración."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="block-form" loading={submitting}>
            Guardar registro
          </Button>
        </>
      }
    >
      <form id="block-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Profesional"
            required
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            options={doctors.filter((d) => d.active).map((d) => ({ value: d.id, label: `${d.title} ${d.firstName} ${d.lastName}` }))}
          />
          <Select
            label="Tipo"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as UnavailabilityType)}
            options={(Object.keys(UNAVAILABILITY_META) as UnavailabilityType[]).map((k) => ({
              value: k,
              label: UNAVAILABILITY_META[k].label,
            }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Desde" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="Hasta" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 rounded border-line text-primary-700 focus:ring-primary-300"
          />
          Jornada completa
        </label>

        {!allDay && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Hora inicio" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <Input label="Hora fin" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        )}

        <Textarea
          label="Motivo"
          required
          placeholder="Ej. Ateneo médico, licencia anual, congreso…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </form>
    </Modal>
  );
}
