import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input, Modal, Select } from '@/components/ui';
import { DAY_OF_WEEK_SHORT } from '@/config/status';
import type { DoctorPayload } from '@/services/doctorsService';
import type { ClinicSite, Doctor, Specialty, WeeklySchedule } from '@/types';

interface DoctorFormModalProps {
  open: boolean;
  onClose: () => void;
  doctor?: Doctor | null;
  specialties: Specialty[];
  sites: ClinicSite[];
  onSubmit: (payload: DoctorPayload, doctorId?: string) => Promise<void>;
}

const WEEKDAYS: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [1, 2, 3, 4, 5, 6];

export function DoctorFormModal({ open, onClose, doctor, specialties, sites, onSubmit }: DoctorFormModalProps) {
  const isEdit = Boolean(doctor);

  const [title, setTitle] = useState<Doctor['title']>('Dr.');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [siteId, setSiteId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [active, setActive] = useState(true);
  const [days, setDays] = useState<WeeklySchedule['dayOfWeek'][]>([1, 3, 5]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('14:00');
  const [slotMinutes, setSlotMinutes] = useState(20);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (doctor) {
      setTitle(doctor.title);
      setFirstName(doctor.firstName);
      setLastName(doctor.lastName);
      setLicenseNumber(doctor.licenseNumber);
      setSelectedSpecialties(doctor.specialtyIds);
      setSiteId(doctor.siteId ?? sites[0]?.id ?? '');
      setEmail(doctor.email);
      setPhone(doctor.phone);
      setActive(doctor.active);
      setDays(doctor.schedule.map((s) => s.dayOfWeek));
      setStartTime(doctor.schedule[0]?.startTime ?? '08:00');
      setEndTime(doctor.schedule[0]?.endTime ?? '14:00');
      setSlotMinutes(doctor.schedule[0]?.slotMinutes ?? 20);
    } else {
      setTitle('Dr.');
      setFirstName('');
      setLastName('');
      setLicenseNumber('MN ');
      setSelectedSpecialties(specialties[0] ? [specialties[0].id] : []);
      setSiteId(sites[0]?.id ?? '');
      setEmail('');
      setPhone('549114000');
      setActive(true);
      setDays([1, 3, 5]);
      setStartTime('08:00');
      setEndTime('14:00');
      setSlotMinutes(20);
    }
  }, [open, doctor, specialties, sites]);

  const toggleSpecialty = (id: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleDay = (day: WeeklySchedule['dayOfWeek']) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Ingresá nombre y apellido del profesional.');
      return;
    }
    if (!licenseNumber.trim()) {
      setError('Ingresá el número de matrícula (ej. MN 900120).');
      return;
    }
    if (selectedSpecialties.length === 0) {
      setError('Seleccioná al menos una especialidad.');
      return;
    }
    if (days.length === 0) {
      setError('Seleccioná al menos un día de atención.');
      return;
    }

    setSubmitting(true);
    try {
      const schedule: WeeklySchedule[] = days.map((dayOfWeek) => ({
        dayOfWeek,
        startTime,
        endTime,
        slotMinutes,
      }));
      await onSubmit(
        {
          title,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          licenseNumber: licenseNumber.trim(),
          specialtyIds: selectedSpecialties,
          siteId: siteId || undefined,
          email: email.trim() || `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}@centro-oncologico.demo`,
          phone: phone.replace(/\D/g, '') || '5491140000000',
          active,
          schedule,
        },
        doctor?.id,
      );
      onClose();
    } catch {
      setError('No se pudo guardar el profesional. Intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Editar profesional' : 'Registrar nuevo profesional'}
      description="Datos administrativos, matrícula, especialidades y sede de atención."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="doctor-form" loading={submitting}>
            {isEdit ? 'Guardar cambios' : 'Registrar médico'}
          </Button>
        </>
      }
    >
      <form id="doctor-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value as Doctor['title'])}
            options={[
              { value: 'Dr.', label: 'Dr.' },
              { value: 'Dra.', label: 'Dra.' },
              { value: 'Lic.', label: 'Lic.' },
            ]}
          />
          <Input label="Nombre" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ej. Alejandro" />
          <Input label="Apellido" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ej. Domínguez" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Matrícula" required value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="MN 900120" />
          <Select
            label="Sede principal"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            options={sites.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Select
            label="Estado"
            value={active ? 'active' : 'inactive'}
            onChange={(e) => setActive(e.target.value === 'active')}
            options={[
              { value: 'active', label: 'Activo' },
              { value: 'inactive', label: 'Inactivo / Licencia' },
            ]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Correo institucional" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="profesional@centro-oncologico.demo" />
          <Input label="Teléfono (AR)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5491140000199" />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Especialidades asociadas</p>
          <div className="flex flex-wrap gap-2">
            {specialties.map((esp) => {
              const selected = selectedSpecialties.includes(esp.id);
              return (
                <button
                  key={esp.id}
                  type="button"
                  onClick={() => toggleSpecialty(esp.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selected
                      ? 'border-primary-700 bg-primary-50 text-primary-800'
                      : 'border-line bg-white text-slate-600 hover:bg-surface'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: esp.color }} />
                  {esp.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Disponibilidad horaria base</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => {
              const activeDay = days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    activeDay
                      ? 'bg-primary-700 text-white'
                      : 'border border-line bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {DAY_OF_WEEK_SHORT[day]}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Desde" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <Input label="Hasta" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            <Select
              label="Duración turno"
              value={String(slotMinutes)}
              onChange={(e) => setSlotMinutes(Number(e.target.value))}
              options={[
                { value: '15', label: '15 minutos' },
                { value: '20', label: '20 minutos' },
                { value: '30', label: '30 minutos' },
                { value: '45', label: '45 minutos' },
              ]}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
