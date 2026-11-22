import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui';
import type { SpecialtyPayload } from '@/services/catalogService';
import type { Specialty } from '@/types';

interface SpecialtyFormModalProps {
  open: boolean;
  onClose: () => void;
  specialty?: Specialty | null;
  onSubmit: (payload: SpecialtyPayload, id?: string) => Promise<void>;
}

const COLOR_PRESETS = ['#0F4C5C', '#14B8A6', '#3F8CA0', '#0D9488', '#77B3C2', '#5CDCC4', '#155E70', '#2DD4BF'];

export function SpecialtyFormModal({ open, onClose, specialty, onSubmit }: SpecialtyFormModalProps) {
  const isEdit = Boolean(specialty);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState(30);
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (specialty) {
      setName(specialty.name);
      setDescription(specialty.description);
      setDefaultDurationMinutes(specialty.defaultDurationMinutes ?? 30);
      setColor(specialty.color);
      setActive(specialty.active);
    } else {
      setName('');
      setDescription('');
      setDefaultDurationMinutes(30);
      setColor(COLOR_PRESETS[0]);
      setActive(true);
    }
  }, [open, specialty]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !description.trim()) {
      setError('Completá el nombre y la descripción de la especialidad.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(
        {
          name: name.trim(),
          description: description.trim(),
          defaultDurationMinutes,
          color,
          active,
        },
        specialty?.id,
      );
      onClose();
    } catch {
      setError('No se pudo guardar la especialidad.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Editar especialidad' : 'Nueva especialidad'}
      description="Definí descripción, duración estándar de consulta e identificador visual."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="specialty-form" loading={submitting}>
            {isEdit ? 'Guardar cambios' : 'Crear especialidad'}
          </Button>
        </>
      }
    >
      <form id="specialty-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        )}

        <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Genética oncológica" />
        <Textarea
          label="Descripción"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Alcance de la especialidad y prestaciones principales…"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Duración estándar de consulta"
            value={String(defaultDurationMinutes)}
            onChange={(e) => setDefaultDurationMinutes(Number(e.target.value))}
            options={[
              { value: '15', label: '15 minutos' },
              { value: '20', label: '20 minutos' },
              { value: '25', label: '25 minutos' },
              { value: '30', label: '30 minutos' },
              { value: '40', label: '40 minutos' },
              { value: '45', label: '45 minutos' },
              { value: '60', label: '60 minutos' },
            ]}
          />
          <Select
            label="Estado"
            value={active ? 'active' : 'inactive'}
            onChange={(e) => setActive(e.target.value === 'active')}
            options={[
              { value: 'active', label: 'Activa' },
              { value: 'inactive', label: 'Inactiva' },
            ]}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-700">Color de referencia (agendas y reportes)</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  color === preset ? 'scale-110 border-slate-900' : 'border-transparent'
                }`}
                style={{ backgroundColor: preset }}
                aria-label={`Seleccionar color ${preset}`}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
