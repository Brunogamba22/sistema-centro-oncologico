import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Mail,
  Pencil,
  RotateCcw,
  Search,
  Send,
  Settings2,
} from 'lucide-react';
import { StatCard } from '@/components/data-display/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Modal,
  PageLoader,
  Select,
  TableContainer,
  Tabs,
  Textarea,
} from '@/components/ui';
import {
  NOTIFICATION_CATEGORY_META,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_DELIVERY_META,
} from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { useAsync } from '@/hooks/useAsync';
import { auditService, notificationsService, patientsService } from '@/services';
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationRule,
} from '@/types';
import { formatDateTime, formatPhoneAR } from '@/utils/format';

type TabId = 'historial' | 'configuracion';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const { data, loading, reload } = useAsync(async () => {
    const [logs, rules, patients] = await Promise.all([
      notificationsService.listLogs(),
      notificationsService.listRules(),
      patientsService.list(),
    ]);
    return { logs, rules, patients };
  }, []);

  const [activeTab, setActiveTab] = useState<TabId>('historial');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal enviar simulación
  const [sendOpen, setSendOpen] = useState(false);
  const [sendPatientId, setSendPatientId] = useState('pat-001');
  const [sendCategory, setSendCategory] = useState<NotificationCategory>('recordatorio');
  const [sendChannel, setSendChannel] = useState<NotificationChannel>('whatsapp');
  const [sendMessage, setSendMessage] = useState(
    'Hola, te recordamos tu próximo turno en Centro Oncológico Integral. Respondé 1 para confirmar.',
  );

  // Modal editar plantilla
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [ruleTemplate, setRuleTemplate] = useState('');
  const [ruleTiming, setRuleTiming] = useState('');

  const patientMap = useMemo(() => new Map(data?.patients.map((p) => [p.id, p]) ?? []), [data?.patients]);

  const filteredLogs = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.logs.filter((log) => {
      if (categoryFilter && log.category !== categoryFilter) return false;
      if (statusFilter && log.status !== statusFilter) return false;
      if (q) {
        const patient = patientMap.get(log.patientId);
        const text = `${log.subject} ${log.message} ${log.recipient} ${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, categoryFilter, statusFilter, patientMap]);

  const handleToggleRule = async (rule: NotificationRule) => {
    await notificationsService.updateRule(rule.id, { enabled: !rule.enabled });
    toast({
      title: rule.enabled ? 'Regla pausada' : 'Regla activada',
      description: `"${rule.name}" fue ${rule.enabled ? 'deshabilitada' : 'habilitada'}.`,
      variant: 'info',
    });
    await reload();
  };

  const handleSaveRule = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingRule) return;
    await notificationsService.updateRule(editingRule.id, {
      template: ruleTemplate.trim(),
      timingLabel: ruleTiming.trim(),
    });
    await auditService.record({
      userId: user?.id ?? 'usr-001',
      userName: user?.name ?? 'Administrador',
      userRole: user?.role,
      action: 'editar',
      module: 'Notificaciones',
      entity: 'NotificationRule',
      entityId: editingRule.id,
      description: `Actualizó plantilla de notificación "${editingRule.name}".`,
    });
    toast({ title: 'Plantilla actualizada', description: 'Se guardaron los cambios de la regla.', variant: 'success' });
    setEditingRule(null);
    await reload();
  };

  const handleSendManual = async (event: FormEvent) => {
    event.preventDefault();
    const patient = patientMap.get(sendPatientId);
    if (!patient || !sendMessage.trim()) return;
    const recipient = sendChannel === 'email' ? (patient.email ?? 'sin-correo@correo.demo') : formatPhoneAR(patient.phone);
    await notificationsService.sendManual({
      category: sendCategory,
      channel: sendChannel,
      patientId: patient.id,
      recipient,
      subject: `${NOTIFICATION_CATEGORY_META[sendCategory].label} manual · ${patient.lastName}`,
      message: sendMessage.trim(),
    });
    toast({
      title: 'Notificación simulada enviada',
      description: `Se registró el envío por ${NOTIFICATION_CHANNEL_LABELS[sendChannel]} a ${patient.lastName}, ${patient.firstName}.`,
      variant: 'success',
    });
    setSendOpen(false);
    await reload();
  };

  if (loading || !data) return <PageLoader />;

  const deliveredCount = data.logs.filter((l) => l.status === 'entregada' || l.status === 'leida').length;
  const failedCount = data.logs.filter((l) => l.status === 'fallida').length;
  const activeRulesCount = data.rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones"
        description="Configuración e historial de recordatorios, confirmaciones, cancelaciones y reprogramaciones."
        actions={
          <Button size="sm" leftIcon={<Send className="h-4 w-4" />} onClick={() => setSendOpen(true)}>
            Simular envío manual
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Notificaciones registradas" value={data.logs.length} icon={Bell} hint="historial reciente" />
        <StatCard label="Entregadas / Leídas" value={deliveredCount} icon={CheckCircle2} tone="accent" hint="recepción confirmada" />
        <StatCard label="Reglas automáticas" value={`${activeRulesCount} / ${data.rules.length}`} icon={Settings2} hint="activas actualmente" />
        <StatCard label="Envíos fallidos" value={failedCount} icon={AlertCircle} tone="rose" hint="requieren reintento" />
      </div>

      <Tabs<TabId>
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'historial', label: 'Historial de envíos', icon: Mail, count: data.logs.length },
          { id: 'configuracion', label: 'Configuración y plantillas', icon: Settings2, count: data.rules.length },
        ]}
      />

      {activeTab === 'historial' ? (
        <>
          <Card>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="Buscar paciente, destinatario o mensaje…"
                leftIcon={<Search />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                placeholder="Todas las categorías"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={(Object.keys(NOTIFICATION_CATEGORY_META) as NotificationCategory[]).map((k) => ({
                  value: k,
                  label: NOTIFICATION_CATEGORY_META[k].label,
                }))}
              />
              <Select
                placeholder="Todos los estados"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={(Object.keys(NOTIFICATION_DELIVERY_META) as NotificationDeliveryStatus[]).map((k) => ({
                  value: k,
                  label: NOTIFICATION_DELIVERY_META[k].label,
                }))}
              />
            </CardContent>
            {(search || categoryFilter || statusFilter) && (
              <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-xs text-slate-500">
                <span>{filteredLogs.length} envío(s) encontrados</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('');
                    setStatusFilter('');
                  }}
                  className="inline-flex items-center gap-1 font-medium text-primary-700 hover:underline"
                >
                  <RotateCcw className="h-3 w-3" /> Limpiar filtros
                </button>
              </div>
            )}
          </Card>

          <Card>
            {filteredLogs.length === 0 ? (
              <EmptyState icon={Bell} title="Sin envíos coincidentes" description="Ajustá los filtros para ver el historial." />
            ) : (
              <TableContainer>
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-line bg-surface/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Evento / Mensaje</th>
                      <th className="px-5 py-3">Paciente</th>
                      <th className="px-5 py-3">Canal / Destinatario</th>
                      <th className="px-5 py-3">Fecha</th>
                      <th className="px-5 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredLogs.map((log) => {
                      const patient = patientMap.get(log.patientId);
                      const catMeta = NOTIFICATION_CATEGORY_META[log.category];
                      const statusMeta = NOTIFICATION_DELIVERY_META[log.status];
                      return (
                        <tr key={log.id} className="transition hover:bg-surface/50">
                          <td className="max-w-[320px] px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <Badge variant={catMeta.variant}>{catMeta.label}</Badge>
                              <span className="truncate text-xs font-semibold text-slate-800">{log.subject}</span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{log.message}</p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-800">
                            {patient ? `${patient.lastName}, ${patient.firstName}` : 'Paciente'}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-xs">
                            <p className="font-medium text-slate-700">{NOTIFICATION_CHANNEL_LABELS[log.channel]}</p>
                            <p className="text-slate-500">{log.recipient}</p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-600">
                            {formatDateTime(log.sentAt)} hs
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <Badge variant={statusMeta.variant} dot>
                              {statusMeta.label}
                            </Badge>
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
        <div className="grid gap-4 lg:grid-cols-2">
          {data.rules.map((rule) => {
            const catMeta = NOTIFICATION_CATEGORY_META[rule.category];
            return (
              <Card key={rule.id} className="flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={catMeta.variant}>{catMeta.label}</Badge>
                        <Badge variant={rule.enabled ? 'success' : 'neutral'} dot>
                          {rule.enabled ? 'Activa' : 'Pausada'}
                        </Badge>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-slate-900">{rule.name}</h3>
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{rule.description}</p>
                  <p className="mt-2 text-xs font-medium text-primary-700">Disparador: {rule.timingLabel}</p>
                  <div className="mt-3 rounded-lg border border-line bg-surface/70 p-3 text-xs text-slate-700">
                    {rule.template}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {rule.channels.map((ch) => (
                      <Badge key={ch} variant="neutral">
                        {NOTIFICATION_CHANNEL_LABELS[ch]}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-line pt-3">
                  {isAdmin ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Pencil className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setEditingRule(rule);
                          setRuleTemplate(rule.template);
                          setRuleTiming(rule.timingLabel);
                        }}
                      >
                        Editar plantilla
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggleRule(rule)}>
                        {rule.enabled ? 'Pausar' : 'Activar'}
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">Edición reservada a Administrador</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal envío manual simulado */}
      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        size="md"
        title="Simular envío de notificación"
        description="Registra un envío ficticio en el historial (sin conexión a proveedores externos)."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSendOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="manual-notif-form">
              Enviar simulación
            </Button>
          </>
        }
      >
        <form id="manual-notif-form" onSubmit={handleSendManual} className="space-y-4">
          <Select
            label="Paciente"
            value={sendPatientId}
            onChange={(e) => setSendPatientId(e.target.value)}
            options={data.patients.map((p) => ({ value: p.id, label: `${p.lastName}, ${p.firstName}` }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Tipo de aviso"
              value={sendCategory}
              onChange={(e) => setSendCategory(e.target.value as NotificationCategory)}
              options={(Object.keys(NOTIFICATION_CATEGORY_META) as NotificationCategory[]).map((k) => ({
                value: k,
                label: NOTIFICATION_CATEGORY_META[k].label,
              }))}
            />
            <Select
              label="Canal"
              value={sendChannel}
              onChange={(e) => setSendChannel(e.target.value as NotificationChannel)}
              options={(Object.keys(NOTIFICATION_CHANNEL_LABELS) as NotificationChannel[]).map((k) => ({
                value: k,
                label: NOTIFICATION_CHANNEL_LABELS[k],
              }))}
            />
          </div>
          <Textarea label="Mensaje" rows={3} required value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} />
        </form>
      </Modal>

      {/* Modal editar regla */}
      <Modal
        open={Boolean(editingRule)}
        onClose={() => setEditingRule(null)}
        size="md"
        title={editingRule ? `Editar regla: ${editingRule.name}` : 'Editar regla'}
        description="Variables disponibles: {{paciente}}, {{fecha}}, {{hora}}, {{profesional}}, {{sede}}."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingRule(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="rule-edit-form">
              Guardar plantilla
            </Button>
          </>
        }
      >
        <form id="rule-edit-form" onSubmit={handleSaveRule} className="space-y-4">
          <Input label="Momento de envío" value={ruleTiming} onChange={(e) => setRuleTiming(e.target.value)} />
          <Textarea label="Plantilla de mensaje" rows={4} required value={ruleTemplate} onChange={(e) => setRuleTemplate(e.target.value)} />
        </form>
      </Modal>
    </div>
  );
}
