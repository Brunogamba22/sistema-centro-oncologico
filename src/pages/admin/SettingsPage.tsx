import { useEffect, useState, type FormEvent } from 'react';
import { Building2, DoorOpen, Pencil, Plus, Power, Save, Settings, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Modal,
  PageLoader,
  Select,
  TableContainer,
  Tabs,
} from '@/components/ui';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { useAsync } from '@/hooks/useAsync';
import { auditService, settingsService } from '@/services';
import type { ClinicSite, ConsultingRoom, InstitutionSettings } from '@/types';

type TabId = 'institucional' | 'sedes' | 'consultorios' | 'preferencias';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data, loading, reload } = useAsync(async () => {
    const [settings, sites, rooms] = await Promise.all([
      settingsService.getSettings(),
      settingsService.listSites(),
      settingsService.listRooms(),
    ]);
    return { settings, sites, rooms };
  }, []);

  const [activeTab, setActiveTab] = useState<TabId>('institucional');
  const [form, setForm] = useState<InstitutionSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Sedes modal
  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<ClinicSite | null>(null);
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [siteCity, setSiteCity] = useState('CABA');
  const [siteProvince, setSiteProvince] = useState('Ciudad Autónoma de Buenos Aires');
  const [sitePhone, setSitePhone] = useState('');
  const [siteEmail, setSiteEmail] = useState('');
  const [siteHours, setSiteHours] = useState('Lun a Vie 08:00 a 19:00');
  const [siteMain, setSiteMain] = useState(false);

  // Consultorios
  const [roomSiteFilter, setRoomSiteFilter] = useState('');
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ConsultingRoom | null>(null);
  const [roomSiteId, setRoomSiteId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomFloor, setRoomFloor] = useState('Piso 1');
  const [roomFocus, setRoomFocus] = useState('');

  useEffect(() => {
    if (data?.settings && !form) {
      setForm(data.settings);
    }
  }, [data?.settings, form]);

  const handleSaveSettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSavingSettings(true);
    try {
      await settingsService.updateSettings(form);
      await auditService.record({
        userId: user?.id ?? 'usr-001',
        userName: user?.name ?? 'Administrador',
        userRole: user?.role,
        action: 'editar',
        module: 'Configuración',
        entity: 'InstitutionSettings',
        description: 'Actualizó datos institucionales y preferencias operativas del centro.',
      });
      toast({
        title: 'Configuración guardada',
        description: 'Los cambios institucionales y operativos fueron aplicados.',
        variant: 'success',
      });
      await reload();
    } finally {
      setSavingSettings(false);
    }
  };

  const openSiteModal = (site?: ClinicSite) => {
    if (site) {
      setEditingSite(site);
      setSiteName(site.name);
      setSiteAddress(site.address);
      setSiteCity(site.city);
      setSiteProvince(site.province);
      setSitePhone(site.phone);
      setSiteEmail(site.email);
      setSiteHours(site.hours);
      setSiteMain(site.isMain);
    } else {
      setEditingSite(null);
      setSiteName('');
      setSiteAddress('');
      setSiteCity('CABA');
      setSiteProvince('Ciudad Autónoma de Buenos Aires');
      setSitePhone('+54 11 4000-00');
      setSiteEmail('');
      setSiteHours('Lun a Vie 08:00 a 19:00');
      setSiteMain(false);
    }
    setSiteModalOpen(true);
  };

  const handleSaveSite = async (event: FormEvent) => {
    event.preventDefault();
    if (!siteName.trim() || !siteAddress.trim()) return;
    await settingsService.saveSite(
      {
        name: siteName.trim(),
        address: siteAddress.trim(),
        city: siteCity.trim(),
        province: siteProvince.trim(),
        phone: sitePhone.trim(),
        email: siteEmail.trim() || 'sede@centro-oncologico.demo',
        hours: siteHours.trim(),
        isMain: siteMain,
        active: editingSite ? editingSite.active : true,
      },
      editingSite?.id,
    );
    toast({ title: editingSite ? 'Sede actualizada' : 'Sede registrada', variant: 'success' });
    setSiteModalOpen(false);
    await reload();
  };

  const openRoomModal = (room?: ConsultingRoom) => {
    if (room) {
      setEditingRoom(room);
      setRoomSiteId(room.siteId);
      setRoomName(room.name);
      setRoomFloor(room.floor);
      setRoomFocus(room.specialtyFocus);
    } else {
      setEditingRoom(null);
      setRoomSiteId(data?.sites[0]?.id ?? '');
      setRoomName('');
      setRoomFloor('Piso 1');
      setRoomFocus('');
    }
    setRoomModalOpen(true);
  };

  const handleSaveRoom = async (event: FormEvent) => {
    event.preventDefault();
    if (!roomName.trim() || !roomSiteId) return;
    await settingsService.saveRoom(
      {
        siteId: roomSiteId,
        name: roomName.trim(),
        floor: roomFloor.trim(),
        specialtyFocus: roomFocus.trim() || 'Atención general',
        active: editingRoom ? editingRoom.active : true,
      },
      editingRoom?.id,
    );
    toast({ title: editingRoom ? 'Consultorio actualizado' : 'Consultorio registrado', variant: 'success' });
    setRoomModalOpen(false);
    await reload();
  };

  if (loading || !data || !form) return <PageLoader />;

  const siteMap = new Map(data.sites.map((s) => [s.id, s]));
  const visibleRooms = roomSiteFilter ? data.rooms.filter((r) => r.siteId === roomSiteFilter) : data.rooms;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Datos institucionales, sedes, consultorios y preferencias operativas del centro."
      />

      <Tabs<TabId>
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'institucional', label: 'Datos institucionales', icon: Settings },
          { id: 'sedes', label: 'Sedes', icon: Building2, count: data.sites.length },
          { id: 'consultorios', label: 'Consultorios', icon: DoorOpen, count: data.rooms.length },
          { id: 'preferencias', label: 'Preferencias', icon: SlidersHorizontal },
        ]}
      />

      {activeTab === 'institucional' && (
        <Card>
          <CardHeader title="Identidad y contacto institucional" description="Información utilizada en comprobantes, recordatorios y encabezado." />
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input label="Razón social / Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input label="Sigla" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} />
                <Input label="CUIT (ficticio)" value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
                <Input label="Teléfono central" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input label="WhatsApp institucional" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                <Input label="Correo institucional" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input label="Sitio web" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                <Select
                  label="Huso horario"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  options={[{ value: 'America/Argentina/Buenos_Aires', label: 'Argentina (UTC-3 · Buenos Aires)' }]}
                />
              </div>
              <div className="flex justify-end border-t border-line pt-4">
                <Button type="submit" loading={savingSettings} leftIcon={<Save className="h-4 w-4" />}>
                  Guardar datos institucionales
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'sedes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openSiteModal()}>
              Agregar sede
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.sites.map((site) => (
              <Card key={site.id} className="flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{site.name}</h3>
                      {site.isMain && (
                        <Badge variant="primary" className="mt-1">
                          Sede principal
                        </Badge>
                      )}
                    </div>
                    <Badge variant={site.active ? 'success' : 'neutral'} dot>
                      {site.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <p>{site.address} · {site.city}, {site.province}</p>
                    <p>{site.phone} · {site.email}</p>
                    <p className="font-medium text-primary-700">{site.hours}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-1 border-t border-line pt-3">
                  <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openSiteModal(site)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await settingsService.toggleSite(site.id);
                      await reload();
                    }}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'consultorios' && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="w-64">
              <Select
                placeholder="Todas las sedes"
                value={roomSiteFilter}
                onChange={(e) => setRoomSiteFilter(e.target.value)}
                options={data.sites.map((s) => ({ value: s.id, label: s.name }))}
              />
            </div>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openRoomModal()}>
              Agregar consultorio
            </Button>
          </div>
          <TableContainer>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-surface/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Consultorio / Box</th>
                  <th className="px-5 py-3">Sede</th>
                  <th className="px-5 py-3">Ubicación</th>
                  <th className="px-5 py-3">Especialidad / Uso</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleRooms.map((room) => (
                  <tr key={room.id} className="transition hover:bg-surface/50">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{room.name}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-700">{siteMap.get(room.siteId)?.name ?? '-'}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{room.floor}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{room.specialtyFocus}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={room.active ? 'success' : 'neutral'} dot>
                        {room.active ? 'Habilitado' : 'En mantenimiento'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openRoomModal(room)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await settingsService.toggleRoom(room.id);
                            await reload();
                          }}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        </Card>
      )}

      {activeTab === 'preferencias' && (
        <Card>
          <CardHeader title="Preferencias operativas y agenda" description="Parámetros globales de turnos, validaciones y automatizaciones." />
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Select
                  label="Duración estándar de turno"
                  value={String(form.defaultSlotMinutes)}
                  onChange={(e) => setForm({ ...form, defaultSlotMinutes: Number(e.target.value) })}
                  options={[
                    { value: '15', label: '15 minutos' },
                    { value: '20', label: '20 minutos' },
                    { value: '30', label: '30 minutos' },
                  ]}
                />
                <Input
                  label="Anticipación máxima (días)"
                  type="number"
                  min={7}
                  max={180}
                  value={String(form.maxAdvanceBookingDays)}
                  onChange={(e) => setForm({ ...form, maxAdvanceBookingDays: Number(e.target.value) })}
                />
                <Input
                  label="Recordatorio previo (horas)"
                  type="number"
                  min={6}
                  max={72}
                  value={String(form.reminderHoursBefore)}
                  onChange={(e) => setForm({ ...form, reminderHoursBefore: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-3 rounded-xl border border-line bg-surface/50 p-4">
                {(
                  [
                    {
                      key: 'autoConfirmWhatsapp',
                      label: 'Confirmación automática por WhatsApp',
                      desc: 'Cambia el estado del turno a Confirmado cuando el paciente responde "1" al recordatorio.',
                    },
                    {
                      key: 'requireDniValidation',
                      label: 'Validación obligatoria de DNI en admisión',
                      desc: 'Solicita DNI de 7 u 8 dígitos antes de registrar nuevos pacientes o turnos.',
                    },
                    {
                      key: 'enableChatbotHandoff',
                      label: 'Derivación automática del chatbot a recepción',
                      desc: 'Transfiere a la bandeja humana cuando el paciente solicita recetas especiales o cambio de cobertura.',
                    },
                  ] as const
                ).map((item) => (
                  <label key={item.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-lg bg-white p-3.5 ring-1 ring-line">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form[item.key]}
                      onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-700 focus:ring-primary-600"
                    />
                  </label>
                ))}
              </div>

              <div className="flex justify-end border-t border-line pt-4">
                <Button type="submit" loading={savingSettings} leftIcon={<Save className="h-4 w-4" />}>
                  Guardar preferencias
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Modal Sede */}
      <Modal
        open={siteModalOpen}
        onClose={() => setSiteModalOpen(false)}
        size="md"
        title={editingSite ? 'Editar sede' : 'Nueva sede'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSiteModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="site-form">
              Guardar sede
            </Button>
          </>
        }
      >
        <form id="site-form" onSubmit={handleSaveSite} className="space-y-4">
          <Input label="Nombre de la sede" required value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Ej. Sede Caballito" />
          <Input label="Dirección" required value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="Av. Rivadavia 5100" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Localidad" value={siteCity} onChange={(e) => setSiteCity(e.target.value)} />
            <Input label="Provincia" value={siteProvince} onChange={(e) => setSiteProvince(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Teléfono" value={sitePhone} onChange={(e) => setSitePhone(e.target.value)} />
            <Input label="Correo" type="email" value={siteEmail} onChange={(e) => setSiteEmail(e.target.value)} />
          </div>
          <Input label="Horarios de atención" value={siteHours} onChange={(e) => setSiteHours(e.target.value)} />
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={siteMain} onChange={(e) => setSiteMain(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Definir como sede principal
          </label>
        </form>
      </Modal>

      {/* Modal Consultorio */}
      <Modal
        open={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
        size="sm"
        title={editingRoom ? 'Editar consultorio' : 'Nuevo consultorio'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRoomModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="room-form">
              Guardar consultorio
            </Button>
          </>
        }
      >
        <form id="room-form" onSubmit={handleSaveRoom} className="space-y-4">
          <Select
            label="Sede"
            value={roomSiteId}
            onChange={(e) => setRoomSiteId(e.target.value)}
            options={data.sites.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Input label="Nombre / Número" required value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Ej. Consultorio 104" />
          <Input label="Piso / Sector" value={roomFloor} onChange={(e) => setRoomFloor(e.target.value)} placeholder="Ej. Piso 1" />
          <Input label="Especialidad / Uso principal" value={roomFocus} onChange={(e) => setRoomFocus(e.target.value)} placeholder="Ej. Oncología clínica" />
        </form>
      </Modal>
    </div>
  );
}
