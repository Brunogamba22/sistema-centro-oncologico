import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Check, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, CardContent, EmptyState, PageLoader, Select } from '@/components/ui';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { useAsync } from '@/hooks/useAsync';
import { doctorPortalService } from '@/services';
import type { DoctorNotificationCategory, NotificationType } from '@/types';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';

const CATEGORY_LABELS: Record<DoctorNotificationCategory, string> = {
  turno: 'Turno',
  receta: 'Receta',
  solicitud: 'Solicitud',
  documento: 'Documentación',
  sistema: 'Agenda / Sistema',
};

const TYPE_VARIANTS: Record<NotificationType, 'info' | 'success' | 'warning' | 'danger'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  alert: 'danger',
};

export default function DoctorNotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const doctorId = user?.doctorId ?? '';

  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: notifications, loading, reload } = useAsync(
    () => (doctorId ? doctorPortalService.listNotifications(doctorId) : Promise.resolve([])),
    [doctorId],
  );

  const filtered = useMemo(() => {
    if (!notifications) return [];
    return notifications.filter((n) => {
      if (readFilter === 'unread' && n.read) return false;
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
      return true;
    });
  }, [notifications, readFilter, categoryFilter]);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const handleMarkRead = async (id: string) => {
    await doctorPortalService.markNotificationRead(id);
    await reload();
  };

  const handleMarkAllRead = async () => {
    if (!doctorId) return;
    await doctorPortalService.markAllNotificationsRead(doctorId);
    toast({
      title: 'Notificaciones al día',
      description: 'Todas tus notificaciones fueron marcadas como leídas.',
      variant: 'success',
    });
    await reload();
  };

  if (loading || !notifications) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones"
        description="Avisos personales sobre tus turnos del día, solicitudes de recetas y documentación recibida."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={unreadCount === 0}
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={() => void handleMarkAllRead()}
          >
            Marcar todas como leídas ({unreadCount})
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setReadFilter('all')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition',
                readFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              )}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setReadFilter('unread')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition',
                readFilter === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              )}
            >
              No leídas ({unreadCount})
            </button>
          </div>

          <div className="w-full sm:w-56">
            <Select
              aria-label="Filtrar por categoría"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todas las categorías' },
                ...(Object.keys(CATEGORY_LABELS) as DoctorNotificationCategory[]).map((k) => ({
                  value: k,
                  label: CATEGORY_LABELS[k],
                })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Sin notificaciones para mostrar"
            description="No tenés avisos pendientes con los filtros actuales."
          />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'flex flex-col gap-3 px-5 py-4 transition sm:flex-row sm:items-start sm:justify-between',
                  !item.read && 'bg-primary-50/35',
                )}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!item.read && <span className="h-2 w-2 rounded-full bg-primary-600" aria-label="Sin leer" />}
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <Badge variant={TYPE_VARIANTS[item.type]}>{CATEGORY_LABELS[item.category]}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{item.message}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {!item.read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<Check className="h-3.5 w-3.5" />}
                      onClick={() => void handleMarkRead(item.id)}
                    >
                      Leída
                    </Button>
                  )}
                  {item.link && (
                    <Link to={item.link} onClick={() => !item.read && void handleMarkRead(item.id)}>
                      <Button size="sm" variant="outline" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                        Ir
                      </Button>
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
