import { useMemo, useState } from 'react';
import { Clock, Pencil, Plus, Power, Search, Shapes, Users } from 'lucide-react';
import { StatCard } from '@/components/data-display/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar, Badge, Button, Card, CardContent, EmptyState, Input, PageLoader, Select } from '@/components/ui';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { SpecialtyFormModal } from '@/features/specialties/SpecialtyFormModal';
import { useAsync } from '@/hooks/useAsync';
import { auditService, catalogService, doctorsService } from '@/services';
import type { SpecialtyPayload } from '@/services/catalogService';
import type { Specialty } from '@/types';

export default function SpecialtiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data, loading, reload } = useAsync(async () => {
    const [specialties, doctors] = await Promise.all([
      catalogService.listSpecialties(),
      doctorsService.list(),
    ]);
    return { specialties, doctors };
  }, []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Specialty | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.specialties.filter((esp) => {
      if (statusFilter === 'active' && !esp.active) return false;
      if (statusFilter === 'inactive' && esp.active) return false;
      if (q && !`${esp.name} ${esp.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, statusFilter]);

  const handleSubmit = async (payload: SpecialtyPayload, id?: string) => {
    if (id) {
      await catalogService.updateSpecialty(id, payload);
      await auditService.record({
        userId: user?.id ?? 'usr-001',
        userName: user?.name ?? 'Administrador',
        userRole: user?.role,
        action: 'editar',
        module: 'Especialidades',
        entity: 'Specialty',
        entityId: id,
        description: `Actualizó la especialidad "${payload.name}" (${payload.defaultDurationMinutes ?? 30} min).`,
      });
      toast({ title: 'Especialidad actualizada', description: `Se guardó "${payload.name}".`, variant: 'success' });
    } else {
      const created = await catalogService.createSpecialty(payload);
      await auditService.record({
        userId: user?.id ?? 'usr-001',
        userName: user?.name ?? 'Administrador',
        userRole: user?.role,
        action: 'crear',
        module: 'Especialidades',
        entity: 'Specialty',
        entityId: created.id,
        description: `Creó la especialidad "${payload.name}".`,
      });
      toast({ title: 'Especialidad creada', description: `"${payload.name}" fue agregada al catálogo.`, variant: 'success' });
    }
    await reload();
  };

  const handleToggle = async (esp: Specialty) => {
    await catalogService.toggleSpecialtyActive(esp.id);
    toast({
      title: esp.active ? 'Especialidad desactivada' : 'Especialidad activada',
      description: `"${esp.name}" cambió su estado operativo.`,
      variant: 'info',
    });
    await reload();
  };

  if (loading || !data) return <PageLoader />;

  const avgDuration = Math.round(
    data.specialties.reduce((acc, s) => acc + (s.defaultDurationMinutes ?? 30), 0) / Math.max(1, data.specialties.length),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Especialidades"
        description="Catálogo de especialidades oncológicas, profesionales asociados y duración estándar de consultas."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Nueva especialidad
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Especialidades activas"
          value={data.specialties.filter((s) => s.active).length}
          icon={Shapes}
          hint={`de ${data.specialties.length} configuradas`}
        />
        <StatCard
          label="Duración promedio"
          value={`${avgDuration} min`}
          icon={Clock}
          tone="accent"
          hint="por consulta estándar"
        />
        <StatCard
          label="Profesionales vinculados"
          value={data.doctors.filter((d) => d.active).length}
          icon={Users}
          hint="médicos activos en catálogo"
        />
      </div>

      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Buscar especialidad por nombre o descripción…"
              leftIcon={<Search />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            placeholder="Todos los estados"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'active', label: 'Activas' },
              { value: 'inactive', label: 'Inactivas' },
            ]}
          />
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Shapes}
            title="Sin especialidades coincidentes"
            description="Probá ajustando el filtro o creá una nueva especialidad."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((esp) => {
            const associatedDoctors = data.doctors.filter((d) => d.specialtyIds.includes(esp.id));
            return (
              <Card key={esp.id} className="flex flex-col justify-between p-5 transition-shadow hover:shadow-card-hover">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: esp.color }} />
                      <h3 className="text-base font-semibold text-slate-900">{esp.name}</h3>
                    </div>
                    <Badge variant={esp.active ? 'success' : 'neutral'} dot>
                      {esp.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>

                  <p className="mt-2.5 text-sm text-slate-600">{esp.description}</p>

                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 font-medium text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-primary-700" />
                      {esp.defaultDurationMinutes ?? 30} min / consulta
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {associatedDoctors.length} profesional(es)
                    </span>
                  </div>

                  <div className="mt-4 border-t border-line pt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Profesionales asociados
                    </p>
                    {associatedDoctors.length === 0 ? (
                      <p className="text-xs italic text-slate-400">Sin profesionales asignados</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {associatedDoctors.map((doc) => (
                          <span
                            key={doc.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2 py-0.5 text-xs text-slate-700"
                          >
                            <Avatar name={`${doc.firstName} ${doc.lastName}`} size="xs" />
                            {doc.title} {doc.lastName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-1 border-t border-line pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setEditing(esp);
                      setModalOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(esp)} title={esp.active ? 'Desactivar' : 'Activar'}>
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <SpecialtyFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        specialty={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
