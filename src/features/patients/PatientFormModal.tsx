import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button, Input, Modal, Select } from '@/components/ui';
import { PATIENT_STATUS_META } from '@/config/status';
import type { PatientPayload } from '@/services/patientsService';
import type { Coverage, Doctor, Gender, Patient, PatientStatus } from '@/types';

interface PatientFormModalProps {
  open: boolean;
  onClose: () => void;
  patient?: Patient | null;
  coverages: Coverage[];
  doctors: Doctor[];
  onSubmit: (payload: PatientPayload, patientId?: string) => Promise<void>;
}

const PROVINCES = [
  'Ciudad Autónoma de Buenos Aires',
  'Buenos Aires',
  'Córdoba',
  'Santa Fe',
  'Mendoza',
  'Tucumán',
  'Salta',
  'Neuquén',
];

export function PatientFormModal({ open, onClose, patient, coverages, doctors, onSubmit }: PatientFormModalProps) {
  const isEdit = Boolean(patient);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dni, setDni] = useState('');
  const [birthDate, setBirthDate] = useState('1980-01-01');
  const [gender, setGender] = useState<Gender>('F');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState(PROVINCES[0]);
  const [postalCode, setPostalCode] = useState('');
  const [coverageId, setCoverageId] = useState('');
  const [plan, setPlan] = useState('');
  const [affiliateNumber, setAffiliateNumber] = useState('');
  const [status, setStatus] = useState<PatientStatus>('activo');
  const [assignedDoctorId, setAssignedDoctorId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedCoverage = useMemo(() => coverages.find((c) => c.id === coverageId), [coverages, coverageId]);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (patient) {
      setFirstName(patient.firstName);
      setLastName(patient.lastName);
      setDni(patient.dni);
      setBirthDate(patient.birthDate.slice(0, 10));
      setGender(patient.gender);
      setPhone(patient.phone);
      setEmail(patient.email ?? '');
      setStreet(patient.address?.street ?? '');
      setCity(patient.address?.city ?? '');
      setProvince(patient.address?.province ?? PROVINCES[0]);
      setPostalCode(patient.address?.postalCode ?? '');
      setCoverageId(patient.coverage.coverageId);
      setPlan(patient.coverage.plan ?? '');
      setAffiliateNumber(patient.coverage.affiliateNumber);
      setStatus(patient.status);
      setAssignedDoctorId(patient.assignedDoctorId ?? '');
    } else {
      const defaultCov = coverages[0];
      setFirstName('');
      setLastName('');
      setDni('');
      setBirthDate('1980-05-15');
      setGender('F');
      setPhone('549114000');
      setEmail('');
      setStreet('');
      setCity('CABA');
      setProvince(PROVINCES[0]);
      setPostalCode('');
      setCoverageId(defaultCov?.id ?? '');
      setPlan(defaultCov?.plans[0] ?? '');
      setAffiliateNumber('');
      setStatus('activo');
      setAssignedDoctorId(doctors.find((d) => d.active)?.id ?? '');
    }
  }, [open, patient, coverages, doctors]);

  const handleCoverageChange = (nextId: string) => {
    setCoverageId(nextId);
    const cov = coverages.find((c) => c.id === nextId);
    setPlan(cov?.plans[0] ?? '');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanDni = dni.replace(/\D/g, '');
    if (!firstName.trim() || !lastName.trim()) {
      setError('Ingresá nombre y apellido del paciente.');
      return;
    }
    if (!/^\d{7,8}$/.test(cleanDni)) {
      setError('El DNI debe contener 7 u 8 dígitos numéricos (dato ficticio).');
      return;
    }
    if (!affiliateNumber.trim()) {
      setError('Ingresá el número de afiliado (o código particular).');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dni: cleanDni,
          birthDate,
          gender,
          phone: phone.replace(/\D/g, '') || '5491140000000',
          email: email.trim() || undefined,
          address: street.trim()
            ? { street: street.trim(), city: city.trim() || 'CABA', province, postalCode: postalCode.trim() || undefined }
            : undefined,
          coverage: {
            coverageId,
            plan: plan || undefined,
            affiliateNumber: affiliateNumber.trim(),
          },
          status,
          assignedDoctorId: assignedDoctorId || undefined,
        },
        patient?.id,
      );
      onClose();
    } catch {
      setError('No se pudo guardar el paciente. Intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? 'Editar datos administrativos del paciente' : 'Registrar nuevo paciente'}
      description="Utilizá únicamente datos ficticios de demostración."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="patient-form" loading={submitting}>
            {isEdit ? 'Guardar cambios' : 'Registrar paciente'}
          </Button>
        </>
      }
    >
      <form id="patient-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        )}

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Datos personales</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Nombre" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ej. Laura" />
            <Input label="Apellido" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ej. Fernández" />
            <Input label="DNI" required inputMode="numeric" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="30123456" />
            <Input label="Fecha de nacimiento" type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            <Select
              label="Género"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              options={[
                { value: 'F', label: 'Femenino' },
                { value: 'M', label: 'Masculino' },
                { value: 'X', label: 'X / No binario' },
              ]}
            />
            <Select
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as PatientStatus)}
              options={(Object.keys(PATIENT_STATUS_META) as PatientStatus[]).map((k) => ({
                value: k,
                label: PATIENT_STATUS_META[k].label,
              }))}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Contacto y domicilio</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Teléfono (AR)" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5491140001234" hint="Formato 549 + característica + número" />
            <Input label="Correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="paciente@correo.demo" />
            <Select
              label="Profesional de cabecera"
              placeholder="Sin asignar"
              value={assignedDoctorId}
              onChange={(e) => setAssignedDoctorId(e.target.value)}
              options={doctors.filter((d) => d.active).map((d) => ({ value: d.id, label: `${d.title} ${d.firstName} ${d.lastName}` }))}
            />
            <Input label="Domicilio" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Av. Ejemplo 1234" />
            <Input label="Localidad" value={city} onChange={(e) => setCity(e.target.value)} placeholder="CABA" />
            <Select
              label="Provincia"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              options={PROVINCES.map((p) => ({ value: p, label: p }))}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Cobertura médica</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Obra social / Prepaga"
              required
              value={coverageId}
              onChange={(e) => handleCoverageChange(e.target.value)}
              options={coverages.map((c) => ({ value: c.id, label: c.name }))}
            />
            {selectedCoverage && selectedCoverage.plans.length > 0 ? (
              <Select
                label="Plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                options={selectedCoverage.plans.map((p) => ({ value: p, label: p }))}
              />
            ) : (
              <Input label="Plan" value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="No aplica" />
            )}
            <Input
              label="N° de afiliado"
              required
              value={affiliateNumber}
              onChange={(e) => setAffiliateNumber(e.target.value)}
              placeholder="Ej. 310-0048291-01"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
