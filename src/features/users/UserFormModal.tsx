import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input, Modal, Select } from '@/components/ui';
import { ROLE_CONFIG, ROLE_ORDER } from '@/config/roles';
import type { SystemUserPayload } from '@/services/usersService';
import type { ClinicSite, Doctor, Role, SystemUser } from '@/types';

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  user?: SystemUser | null;
  doctors: Doctor[];
  sites: ClinicSite[];
  onSubmit: (payload: SystemUserPayload, userId?: string) => Promise<void>;
}

export function UserFormModal({ open, onClose, user, doctors, sites, onSubmit }: UserFormModalProps) {
  const isEdit = Boolean(user);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('recepcionista');
  const [position, setPosition] = useState('');
  const [siteId, setSiteId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setPosition(user.position);
      setSiteId(user.siteId ?? sites[0]?.id ?? '');
      setDoctorId(user.doctorId ?? '');
      setActive(user.active);
    } else {
      setName('');
      setEmail('');
      setRole('recepcionista');
      setPosition('Recepción y admisión');
      setSiteId(sites[0]?.id ?? '');
      setDoctorId('');
      setActive(true);
    }
  }, [open, user, sites]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Completá nombre y correo electrónico de la cuenta.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          position: position.trim() || ROLE_CONFIG[role].label,
          siteId: siteId || undefined,
          doctorId: role === 'medico' ? doctorId || undefined : undefined,
          active,
        },
        user?.id,
      );
      onClose();
    } catch {
      setError('No se pudo guardar la cuenta de usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Editar cuenta de usuario' : 'Crear cuenta de usuario'}
      description="Asigná uno de los tres roles del sistema (Administrador, Médico o Recepcionista)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" loading={submitting}>
            {isEdit ? 'Guardar cambios' : 'Crear cuenta'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        )}

        <Input label="Nombre y apellido" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Camila Herrera" />
        <Input label="Correo institucional" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="camila.herrera@centro-oncologico.demo" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Rol"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={ROLE_ORDER.map((r) => ({ value: r, label: ROLE_CONFIG[r].label }))}
          />
          <Select
            label="Estado"
            value={active ? 'active' : 'inactive'}
            onChange={(e) => setActive(e.target.value === 'active')}
            options={[
              { value: 'active', label: 'Activa' },
              { value: 'inactive', label: 'Suspendida' },
            ]}
          />
        </div>

        <p className="rounded-lg bg-surface px-3 py-2 text-xs text-slate-600">
          <strong className="text-slate-800">{ROLE_CONFIG[role].label}:</strong> {ROLE_CONFIG[role].description}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Cargo / Área" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ej. Recepción Sede Belgrano" />
          <Select
            label="Sede asignada"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            options={sites.map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>

        {role === 'medico' && (
          <Select
            label="Vincular con profesional del padrón"
            placeholder="Seleccionar profesional…"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            options={doctors.map((d) => ({ value: d.id, label: `${d.title} ${d.firstName} ${d.lastName} (${d.licenseNumber})` }))}
          />
        )}
      </form>
    </Modal>
  );
}
