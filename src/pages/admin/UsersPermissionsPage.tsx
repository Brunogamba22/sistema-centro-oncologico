import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Power,
  Search,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
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
  Tabs,
} from '@/components/ui';
import { ROLE_CONFIG, ROLE_ORDER } from '@/config/roles';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { ROLE_PERMISSION_MATRIX, type PermissionLevel } from '@/data/systemUsers';
import { UserFormModal } from '@/features/users/UserFormModal';
import { useAsync } from '@/hooks/useAsync';
import { auditService, doctorsService, settingsService, usersService } from '@/services';
import type { SystemUserPayload } from '@/services/usersService';
import type { Role, SystemUser } from '@/types';
import { formatDateTime } from '@/utils/format';

type TabId = 'cuentas' | 'matriz';

const ROLE_BADGE_VARIANT: Record<Role, 'primary' | 'accent' | 'info'> = {
  admin: 'primary',
  medico: 'accent',
  recepcionista: 'info',
};

const LEVEL_META: Record<PermissionLevel, { label: string; variant: 'success' | 'info' | 'warning' | 'neutral' }> = {
  full: { label: 'Completo', variant: 'success' },
  limited: { label: 'Limitado', variant: 'info' },
  readonly: { label: 'Solo lectura', variant: 'warning' },
  none: { label: 'Sin acceso', variant: 'neutral' },
};

export default function UsersPermissionsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const { data, loading, reload } = useAsync(async () => {
    const [users, doctors, sites] = await Promise.all([
      usersService.list(),
      doctorsService.list(),
      settingsService.listSites(),
    ]);
    return { users, doctors, sites };
  }, []);

  const [activeTab, setActiveTab] = useState<TabId>('cuentas');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  const siteMap = useMemo(() => new Map(data?.sites.map((s) => [s.id, s]) ?? []), [data?.sites]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.active) return false;
      if (statusFilter === 'inactive' && u.active) return false;
      if (q && !`${u.name} ${u.email} ${u.position}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, roleFilter, statusFilter]);

  const handleSubmit = async (payload: SystemUserPayload, userId?: string) => {
    if (userId) {
      await usersService.update(userId, payload);
      await auditService.record({
        userId: currentUser?.id ?? 'usr-001',
        userName: currentUser?.name ?? 'Administrador',
        userRole: currentUser?.role,
        action: 'editar',
        module: 'Usuarios y permisos',
        entity: 'SystemUser',
        entityId: userId,
        description: `Actualizó cuenta de ${payload.name} (rol: ${ROLE_CONFIG[payload.role].label}).`,
      });
      toast({ title: 'Cuenta actualizada', description: `Se guardaron los datos de ${payload.name}.`, variant: 'success' });
    } else {
      const created = await usersService.create(payload);
      await auditService.record({
        userId: currentUser?.id ?? 'usr-001',
        userName: currentUser?.name ?? 'Administrador',
        userRole: currentUser?.role,
        action: 'crear',
        module: 'Usuarios y permisos',
        entity: 'SystemUser',
        entityId: created.id,
        description: `Creó cuenta ${ROLE_CONFIG[payload.role].label} para ${payload.name}.`,
      });
      toast({ title: 'Cuenta creada', description: `${payload.name} fue habilitado con rol ${ROLE_CONFIG[payload.role].label}.`, variant: 'success' });
    }
    await reload();
  };

  const handleToggleActive = async (u: SystemUser) => {
    if (u.id === currentUser?.id) {
      toast({ title: 'Acción no permitida', description: 'No podés suspender tu propia sesión activa.', variant: 'warning' });
      return;
    }
    await usersService.toggleActive(u.id);
    await auditService.record({
      userId: currentUser?.id ?? 'usr-001',
      userName: currentUser?.name ?? 'Administrador',
      userRole: currentUser?.role,
      action: 'editar',
      module: 'Usuarios y permisos',
      entity: 'SystemUser',
      entityId: u.id,
      description: `${u.active ? 'Suspendió' : 'Reactivó'} la cuenta de ${u.name}.`,
    });
    toast({
      title: u.active ? 'Cuenta suspendida' : 'Cuenta reactivada',
      description: `${u.name} ahora se encuentra ${u.active ? 'inactivo' : 'activo'}.`,
      variant: 'info',
    });
    await reload();
  };

  if (loading || !data) return <PageLoader />;

  const countsByRole = {
    admin: data.users.filter((u) => u.role === 'admin').length,
    medico: data.users.filter((u) => u.role === 'medico').length,
    recepcionista: data.users.filter((u) => u.role === 'recepcionista').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios y permisos"
        description="Administración de cuentas con roles Administrador, Médico y Recepcionista (acceso limitado al Panel Administrativo)."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditingUser(null);
              setModalOpen(true);
            }}
          >
            Nuevo usuario
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cuentas totales" value={data.users.length} icon={Users} hint={`${data.users.filter((u) => u.active).length} activas`} />
        <StatCard label="Administradores" value={countsByRole.admin} icon={ShieldCheck} hint="control total del panel" />
        <StatCard label="Recepcionistas" value={countsByRole.recepcionista} icon={KeyRound} tone="accent" hint="panel admin limitado" />
        <StatCard label="Médicos" value={countsByRole.medico} icon={Shield} hint="acceso exclusivo Panel Médico" />
      </div>

      <Tabs<TabId>
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'cuentas', label: 'Cuentas de usuario', icon: UserCog, count: data.users.length },
          { id: 'matriz', label: 'Matriz de roles y permisos', icon: Lock },
        ]}
      />

      {activeTab === 'cuentas' ? (
        <>
          <Card>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="Buscar por nombre, correo o cargo…"
                leftIcon={<Search />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                placeholder="Todos los roles"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={ROLE_ORDER.map((r) => ({ value: r, label: ROLE_CONFIG[r].label }))}
              />
              <Select
                placeholder="Todos los estados"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'active', label: 'Activas' },
                  { value: 'inactive', label: 'Suspendidas' },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            {filtered.length === 0 ? (
              <EmptyState icon={Users} title="No se encontraron usuarios" description="Modificá los filtros o creá una nueva cuenta." />
            ) : (
              <TableContainer>
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-line bg-surface/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Usuario</th>
                      <th className="px-5 py-3">Rol / Panel</th>
                      <th className="px-5 py-3">Sede</th>
                      <th className="px-5 py-3">Último acceso</th>
                      <th className="px-5 py-3">Estado</th>
                      <th className="px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((u) => {
                      const roleCfg = ROLE_CONFIG[u.role];
                      const site = u.siteId ? siteMap.get(u.siteId) : undefined;
                      return (
                        <tr key={u.id} className="transition hover:bg-surface/50">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar name={u.name} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">{u.name}</p>
                                <p className="truncate text-xs text-slate-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={ROLE_BADGE_VARIANT[u.role]}>{roleCfg.label}</Badge>
                            <p className="mt-1 text-xs text-slate-500">
                              {roleCfg.panel === 'admin' ? 'Panel Administrativo' : 'Panel Médico'} · {u.position}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-700">
                            {site?.name ?? 'Todas las sedes'}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-500">
                            {u.lastLoginAt ? `${formatDateTime(u.lastLoginAt)} hs` : 'Sin ingresos'}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <Badge variant={u.active ? 'success' : 'neutral'} dot>
                              {u.active ? 'Activa' : 'Suspendida'}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Editar usuario"
                                onClick={() => {
                                  setEditingUser(u);
                                  setModalOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={u.active ? 'Suspender' : 'Reactivar'}
                                onClick={() => handleToggleActive(u)}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableContainer>
            )}
          </Card>
        </>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {ROLE_ORDER.map((roleId) => {
              const cfg = ROLE_CONFIG[roleId];
              return (
                <Card key={roleId} className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={ROLE_BADGE_VARIANT[roleId]}>{cfg.label}</Badge>
                    <span className="text-xs font-medium text-slate-400">
                      {cfg.panel === 'admin' ? 'Panel Administrativo' : 'Panel Médico'}
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm text-slate-600">{cfg.description}</p>
                </Card>
              );
            })}
          </div>

          <Card>
            <div className="flex items-center gap-2 border-b border-line bg-primary-50/40 px-5 py-3 text-xs text-primary-900">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-700" />
              <span>
                <strong>Separación administrativa y clínica:</strong> el rol Recepcionista opera dentro del Panel
                Administrativo con permisos limitados (sin acceso a especialidades, usuarios, reportes, auditoría ni
                historia clínica).
              </span>
            </div>
            <TableContainer>
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="border-b border-line bg-surface/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Módulo / Capacidad</th>
                    <th className="px-5 py-3">Ámbito</th>
                    <th className="px-5 py-3">Administrador</th>
                    <th className="px-5 py-3">Recepcionista</th>
                    <th className="px-5 py-3">Médico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ROLE_PERMISSION_MATRIX.map((row) => (
                    <tr key={row.module}>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{row.module}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={row.scope === 'Clínico' ? 'accent' : 'neutral'}>{row.scope}</Badge>
                      </td>
                      {(['admin', 'recepcionista', 'medico'] as Role[]).map((r) => {
                        const perm = row.permissions[r];
                        const meta = LEVEL_META[perm.level];
                        return (
                          <td key={r} className="px-5 py-3.5">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                            <p className="mt-1 text-[11px] text-slate-500">{perm.detail}</p>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          </Card>
        </div>
      )}

      <UserFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        user={editingUser}
        doctors={data.doctors}
        sites={data.sites}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
