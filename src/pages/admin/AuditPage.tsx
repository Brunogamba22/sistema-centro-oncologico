import { useMemo, useState } from 'react';
import { Download, Eye, RotateCcw, ScrollText, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Drawer,
  EmptyState,
  Input,
  PageLoader,
  Pagination,
  Select,
  TableContainer,
} from '@/components/ui';
import { ROLE_CONFIG } from '@/config/roles';
import { AUDIT_ACTION_META } from '@/config/status';
import { useToast } from '@/context/toast/useToast';
import { useAsync } from '@/hooks/useAsync';
import { auditService } from '@/services';
import type { AuditAction, AuditLog } from '@/types';
import { formatDateTime } from '@/utils/format';

const PAGE_SIZE = 8;

export default function AuditPage() {
  const { toast } = useToast();
  const { data: logs, loading } = useAsync(() => auditService.list(), []);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const modules = useMemo(() => {
    const set = new Set((logs ?? []).map((l) => l.module ?? l.entity));
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    if (!logs) return [];
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const mod = log.module ?? log.entity;
      if (actionFilter && log.action !== actionFilter) return false;
      if (moduleFilter && mod !== moduleFilter) return false;
      if (q) {
        const text = `${log.userName} ${log.description} ${mod} ${log.entityId ?? ''} ${log.ip}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, actionFilter, moduleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasFilters = Boolean(search || actionFilter || moduleFilter);
  const resetFilters = () => {
    setSearch('');
    setActionFilter('');
    setModuleFilter('');
    setPage(1);
  };

  if (loading || !logs) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoría"
        description="Trazabilidad de usuarios, acciones, fechas, direcciones IP y módulos afectados."
        actions={
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() =>
              toast({
                title: 'Registro exportado (simulación)',
                description: `Se prepararon ${filtered.length} eventos de auditoría en formato CSV.`,
                variant: 'info',
              })
            }
          >
            Exportar CSV
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Input
            placeholder="Buscar usuario, descripción, entidad o IP…"
            leftIcon={<Search />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            placeholder="Todas las acciones"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            options={(Object.keys(AUDIT_ACTION_META) as AuditAction[]).map((k) => ({
              value: k,
              label: AUDIT_ACTION_META[k].label,
            }))}
          />
          <Select
            placeholder="Todos los módulos"
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setPage(1);
            }}
            options={modules.map((m) => ({ value: m, label: m }))}
          />
        </CardContent>
        {hasFilters && (
          <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-xs text-slate-500">
            <span>{filtered.length} evento(s) encontrados</span>
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
          <EmptyState icon={ScrollText} title="Sin registros coincidentes" description="Ajustá los filtros para consultar el historial." />
        ) : (
          <>
            <TableContainer>
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-line bg-surface/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Fecha y hora</th>
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-5 py-3">Acción</th>
                    <th className="px-5 py-3">Módulo</th>
                    <th className="px-5 py-3">Detalle</th>
                    <th className="px-5 py-3 text-right">Inspección</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginated.map((log) => {
                    const actionMeta = AUDIT_ACTION_META[log.action];
                    return (
                      <tr key={log.id} className="transition hover:bg-surface/50">
                        <td className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-slate-700">
                          {formatDateTime(log.createdAt)} hs
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <p className="font-semibold text-slate-900">{log.userName}</p>
                          <p className="text-xs text-slate-500">
                            {log.userRole ? ROLE_CONFIG[log.userRole].label : 'Usuario'} · {log.ip}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <Badge variant={actionMeta.variant}>{actionMeta.label}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-slate-700">
                          {log.module ?? log.entity}
                        </td>
                        <td className="max-w-[320px] px-5 py-3.5 text-xs text-slate-600">
                          <p className="line-clamp-2">{log.description}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          <Button variant="ghost" size="sm" leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => setSelectedLog(log)}>
                            Detalle
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableContainer>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Drawer
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Detalle de evento de auditoría"
        description={selectedLog ? `ID ${selectedLog.id}` : undefined}
        width="md"
      >
        {selectedLog && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={AUDIT_ACTION_META[selectedLog.action].variant}>
                {AUDIT_ACTION_META[selectedLog.action].label}
              </Badge>
              <Badge variant="neutral">{selectedLog.module ?? selectedLog.entity}</Badge>
            </div>
            <div className="space-y-2.5 rounded-xl border border-line bg-surface/60 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha y hora</span>
                <span className="font-medium text-slate-900">{formatDateTime(selectedLog.createdAt)} hs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Usuario</span>
                <span className="font-medium text-slate-900">{selectedLog.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rol</span>
                <span className="font-medium text-slate-900">
                  {selectedLog.userRole ? ROLE_CONFIG[selectedLog.userRole].label : 'No especificado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Entidad afectada</span>
                <span className="font-medium text-slate-900">
                  {selectedLog.entity}
                  {selectedLog.entityId ? ` (${selectedLog.entityId})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dirección IP</span>
                <span className="font-mono text-slate-800">{selectedLog.ip}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Descripción</p>
              <p className="mt-1.5 leading-relaxed text-slate-700">{selectedLog.description}</p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
