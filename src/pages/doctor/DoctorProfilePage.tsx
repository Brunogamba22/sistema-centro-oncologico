import { useEffect, useState, type FormEvent } from 'react';
import {
  Building2,
  CalendarX2,
  Clock,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Field,
  Input,
  PageLoader,
} from '@/components/ui';
import { DAY_OF_WEEK_LABELS, UNAVAILABILITY_META } from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { useAsync } from '@/hooks/useAsync';
import { agendaService, catalogService, doctorsService, settingsService } from '@/services';
import { formatPhoneAR } from '@/utils/format';

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const doctorId = user?.doctorId;

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPrescriptions, setNotifyPrescriptions] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data, loading, reload } = useAsync(async () => {
    const [doctor, specialties, sites, blocks] = await Promise.all([
      doctorId ? doctorsService.getById(doctorId) : Promise.resolve(undefined),
      catalogService.listSpecialties(),
      settingsService.listSites(),
      agendaService.listBlocks(),
    ]);

    return {
      doctor,
      specialties,
      sites,
      myBlocks: blocks.filter((b) => b.doctorId === doctorId),
    };
  }, [doctorId]);

  useEffect(() => {
    if (data?.doctor) {
      setEmail(data.doctor.email);
      setPhone(data.doctor.phone);
    }
  }, [data?.doctor]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data?.doctor) return;
    setSaving(true);
    try {
      await doctorsService.update(data.doctor.id, {
        email: email.trim(),
        phone: phone.trim(),
      });
      toast({
        title: 'Perfil actualizado',
        description: 'Tus datos de contacto y preferencias de aviso se guardaron en el prototipo.',
        variant: 'success',
      });
      await reload();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data || !data.doctor) {
    return <PageLoader />;
  }

  const { doctor, specialties, sites, myBlocks } = data;
  const doctorSpecialties = specialties.filter((s) => doctor.specialtyIds.includes(s.id));
  const mainSite = sites.find((s) => s.id === doctor.siteId);
  const fullName = `${doctor.title} ${doctor.firstName} ${doctor.lastName}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi perfil"
        description="Información profesional, matrícula, sedes, horarios habituales de atención y preferencias."
      />

      {/* Tarjeta resumen */}
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={fullName} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">{fullName}</h2>
                <Badge variant={doctor.active ? 'success' : 'neutral'} dot>
                  {doctor.active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Matrícula {doctor.licenseNumber} ·{' '}
                {doctorSpecialties.map((s) => s.name).join(' · ')}
              </p>
              {mainSite && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <Building2 className="h-3.5 w-3.5 text-primary-600" />
                  {mainSite.name} ({mainSite.address}, {mainSite.city})
                </p>
              )}
            </div>
          </div>

          <Badge variant="primary" className="self-start px-3 py-1 sm:self-center">
            <ShieldCheck className="h-3.5 w-3.5" />
            Rol Médico · Sesión demo
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Formulario de contacto y preferencias */}
        <Card className="lg:col-span-7">
          <CardHeader
            title="Datos de contacto y preferencias"
            description="La matrícula y especialidades son gestionadas por administración del centro"
          />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="prof-name" label="Nombre y apellido">
                  <Input id="prof-name" value={fullName} disabled />
                </Field>
                <Field id="prof-license" label="Matrícula profesional">
                  <Input id="prof-license" value={doctor.licenseNumber} disabled />
                </Field>
                <Field id="prof-email" label="Correo electrónico" required>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="prof-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </Field>
                <Field
                  id="prof-phone"
                  label="Teléfono de contacto"
                  hint={`Formato actual: ${formatPhoneAR(phone)}`}
                  required
                >
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="prof-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </Field>
              </div>

              <div className="space-y-2.5 rounded-xl border border-line bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Preferencias de notificación (demo)
                </p>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={notifyPrescriptions}
                    onChange={(e) => setNotifyPrescriptions(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary-700 focus:ring-primary-500"
                  />
                  Avisarme cuando ingresen nuevas solicitudes de recetas de mis pacientes
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary-700 focus:ring-primary-500"
                  />
                  Recibir resumen diario de agenda por correo electrónico
                </label>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="primary" loading={saving} leftIcon={<Save className="h-4 w-4" />}>
                  Guardar cambios
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Horarios y bloqueos */}
        <div className="space-y-6 lg:col-span-5">
          <Card>
            <CardHeader
              title="Horarios de atención"
              description="Franjas configuradas para asignación de turnos"
            />
            <CardContent className="space-y-2.5">
              {doctor.schedule.map((slot) => (
                <div
                  key={slot.dayOfWeek}
                  className="flex items-center justify-between rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm"
                >
                  <span className="font-medium text-slate-800">{DAY_OF_WEEK_LABELS[slot.dayOfWeek]}</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-primary-600" />
                    {slot.startTime} a {slot.endTime} hs · {slot.slotMinutes} min
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Especialidades y bloqueos"
              description="Áreas habilitadas y ausencias registradas"
            />
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {doctorSpecialties.map((spec) => (
                  <Badge key={spec.id} variant="accent">
                    <Stethoscope className="h-3 w-3" />
                    {spec.name}
                  </Badge>
                ))}
              </div>

              {myBlocks.length > 0 && (
                <div className="space-y-2 border-t border-line pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Próximos bloqueos horarios
                  </p>
                  {myBlocks.map((blk) => (
                    <div key={blk.id} className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs">
                      <CalendarX2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div>
                        <p className="font-semibold text-amber-900">
                          {UNAVAILABILITY_META[blk.type].label} · {blk.reason}
                        </p>
                        <p className="text-amber-800">
                          {blk.startDate}
                          {blk.endDate !== blk.startDate ? ` al ${blk.endDate}` : ''} ·{' '}
                          {blk.allDay ? 'Todo el día' : `${blk.startTime} - ${blk.endTime} hs`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
