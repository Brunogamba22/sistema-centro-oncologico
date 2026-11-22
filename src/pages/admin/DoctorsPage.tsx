import { useMemo, useState } from 'react';
import {
  Building2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Power,
  RotateCcw,
  Search,
  Stethoscope,
  UserCheck,
  UserX,
} from 'lucide-react';
import { StatCard } from '@/components/data-display/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  PageLoader,
  Select,
  TableContainer,
} from '@/components/ui';
import { DAY_OF_WEEK_SHORT } from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { DoctorFormModal } from '@/features/doctors/DoctorFormModal';
import { useAsync } from '@/hooks/useAsync';
import { auditService, catalogService, doctorsService, settingsService } from '@/services';
import type { DoctorPayload } from '@/services/doctorsService';
import type { Doctor } from '@/types';
import { formatPhoneAR } from '@/utils/format';

export default function DoctorsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const { data, loading, reload } = useAsync(async () => {
    const [doctors, specialties, sites] = await Promise.all([
      doctorsService.list(),
      catalogService.listSpecialties(),
      settingsService.listSites(),
    ]);
    return { doctors, specialties, sites };
  }, []);

  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const specialtyMap = useMemo(() => new Map(data?.specialties.map((s) => [s.id, s]) ?? []), [data?.specialties]);
  const siteMap = useMemo(() => new Map(data?.sites.map((s) => [s.id, s]) ?? []), [data?.sites]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.doctors.filter((doc) => {
      if (specialtyFilter && !doc.specialtyIds.includes(specialtyFilter)) return false;
      if (siteFilter && doc.siteId !== siteFilter) return false;
      if (statusFilter === 'active' && !doc.active) return false;
      if (statusFilter === 'inactive' && doc.active) return false;
      if (q) {
        const text = `${doc.title} ${doc.firstName} ${doc.lastName} ${doc.licenseNumber} ${doc.email}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, specialtyFilter, siteFilter, statusFilter]);

  const hasFilters = Boolean(search || specialtyFilter || siteFilter || statusFilter);

  const resetFilters = () => {
    setSearch('');
    setSpecialtyFilter('');
    setSiteFilter('');
    setStatusFilter('');
  };

  const handleSubmit = async (payload: DoctorPayload, doctorId?: string) => {
    if (doctorId) {
      await doctorsService.update(doctorId, payload);
      await auditService.record({
        userId: user?.id ?? 'usr-001',
        userName: user?.name ?? 'Administrador',
        userRole: user?.role,
        action: 'editar',
        module: 'Médicos',
        entity: 'Doctor',
        entityId: doctorId,
        description: `Actualizó los datos de ${payload.title} ${payload.firstName} ${payload.lastName} (${payload.licenseNumber}).`,
      });
      toast({
        title: 'Profesional actualizado',
        description: `Se guardaron los cambios de ${payload.title} ${payload.lastName}.`,
        variant: 'success',
      });
    } else {
      const created = await doctorsService.create(payload);
      await auditService.record({
        userId: user?.id ?? 'usr-001',
        userName: user?.name ?? 'Administrador',
        userRole: user?.role,
        action: 'crear',
        module: 'Médicos',
        entity: 'Doctor',
        entityId: created.id,
        description: `Registró al profesional ${payload.title} ${payload.firstName} ${payload.lastName} (${payload.licenseNumber}).`,
      });
      toast({
        title: 'Profesional registrado',
        description: `${payload.title} ${payload.firstName} ${payload.lastName} fue incorporado al staff.`,
        variant: 'success',
      });
    }
    await reload();
  };

  const handleToggleActive = async (doc: Doctor) => {
    await doctorsService.toggleActive(doc.id);
    await auditService.record({
      userId: user?.id ?? 'usr-001',
      userName: user?.name ?? 'Administrador',
      userRole: user?.role,
      action: 'editar',
      module: 'Médicos',
      entity: 'Doctor',
      entityId: doc.id,
      description: `Cambió estado de ${doc.title} ${doc.lastName} a ${doc.active ? 'Inactivo' : 'Activo'}.`,
    });
    toast({
      title: doc.active ? 'Profesional desactivado' : 'Profesional activado',
      description: `${doc.title} ${doc.lastName} ahora figura como ${doc.active ? 'inactivo' : 'activo'}.`,
      variant: 'info',
    });
    await reload();
  };

  if (loading || !data) return <PageLoader />;

  const activeCount = data.doctors.filter((d) => d.active).length;
  const inactiveCount = data.doctors.length - activeCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Médicos"
        description="Staff profesional, matrículas, especialidades, contacto, sede y estado operativo."
        actions={
          isAdmin ? (
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingDoctor(null);
                setModalOpen(true);
              }}
            >
              Registrar médico
            </Button>
          ) : (
            <Badge variant="info">Modo consulta (Recepción)</Badge>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Profesionales registrados" value={data.doctors.length} icon={Stethoscope} hint="en todas las sedes" />
        <StatCard label="Activos en agenda" value={activeCount} icon={UserCheck} tone="accent" hint="disponibles para turnos" />
        <StatCard label="Inactivos / Licencia" value={inactiveCount} icon={UserX} tone="amber" hint="sin agenda habilitada" />
      </div>

      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Buscar por nombre, matrícula o email…"
            leftIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="Todas las especialidades"
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            options={data.specialties.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Select
            placeholder="Todas las sedes"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            options={data.sites.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Select
            placeholder="Todos los estados"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'active', label: 'Activos' },
              { value: 'inactive', label: 'Inactivos' },
            ]}
          />
        </CardContent>
        {hasFilters && (
          <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-xs text-slate-500">
            <span>{filtered.length} profesional(es) encontrados</span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-medium text-primary-700 hover:underline"
            >
              <RotateCcw className="h-3 w-3" /> Limpiar filtros
            </button>
          </div>
        )}
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No se encontraron profesionales"
            description="Modificá los filtros de búsqueda o registrá un nuevo médico."
            action={
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <TableContainer>
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-line bg-surface/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Profesional / Matrícula</th>
                  <th className="px-5 py-3">Especialidades</th>
                  <th className="px-5 py-3">Contacto</th>
                  <th className="px-5 py-3">Sede y días</th>
                  <th className="px-5 py-3">Estado</th>
                  {isAdmin && <th className="px-5 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((doc) => {
                  const site = doc.siteId ? siteMap.get(doc.siteId) : undefined;
                  const daysLabel = doc.schedule.map((s) => DAY_OF_WEEK_SHORT[s.dayOfWeek]).join(' · ');
                  const hoursLabel = doc.schedule[0] ? `${doc.schedule[0].startTime}–${doc.schedule[0].endTime} hs` : 'Sin horario';

                  return (
                    <tr key={doc.id} className="transition hover:bg-surface/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${doc.firstName} ${doc.lastName}`} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {doc.title} {doc.firstName} {doc.lastName}
                            </p>
                            <p className="text-xs font-medium text-primary-700">{doc.licenseNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {doc.specialtyIds.map((espId) => {
                            const esp = specialtyMap.get(espId);
                            if (!esp) return null;
                            return (
                              <span
                                key={espId}
                                className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-line"
                              >
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: esp.color }} />
                                {esp.name}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {formatPhoneAR(doc.phone)}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span className="max-w-[200px] truncate">{doc.email}</span>
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <p className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {site?.name ?? 'Sede Central CABA'}
                        </p>
                        <p className="mt-1 text-slate-500">
                          {daysLabel || 'Sin días'} · {hoursLabel}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge variant={doc.active ? 'success' : 'neutral'} dot>
                          {doc.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Editar profesional"
                              onClick={() => {
                                setEditingDoctor(doc);
                                setModalOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={doc.active ? 'Desactivar' : 'Activar'}
                              onClick={() => handleToggleActive(doc)}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableContainer>
        )}
      </Card>

      {isAdmin && (
        <DoctorFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          doctor={editingDoctor}
          specialties={data.specialties}
          sites={data.sites}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
