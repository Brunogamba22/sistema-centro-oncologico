import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, CalendarCheck2, ClipboardList, Plus, Search, Trash2, Users, UserX } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { StatCard } from '@/components/data-display/StatCard';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { Avatar, Badge, Button, Card, CardContent, CardHeader, EmptyState, Input, Modal, Select, Spinner } from '@/components/ui';
import { coverages } from '@/data/coverages';
import { useToast } from '@/context/toast/useToast';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDate, formatDNI, formatLongDate, formatPhoneAR, formatTime } from '@/utils/format';

const PRIMARY = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;

/* Clases explícitas para que Tailwind las incluya en el build. */
const PRIMARY_CLASSES: Record<(typeof PRIMARY)[number], string> = {
  '50': 'bg-primary-50', '100': 'bg-primary-100', '200': 'bg-primary-200', '300': 'bg-primary-300', '400': 'bg-primary-400',
  '500': 'bg-primary-500', '600': 'bg-primary-600', '700': 'bg-primary-700', '800': 'bg-primary-800', '900': 'bg-primary-900',
};
const ACCENT_CLASSES: Record<(typeof PRIMARY)[number], string> = {
  '50': 'bg-accent-50', '100': 'bg-accent-100', '200': 'bg-accent-200', '300': 'bg-accent-300', '400': 'bg-accent-400',
  '500': 'bg-accent-500', '600': 'bg-accent-600', '700': 'bg-accent-700', '800': 'bg-accent-800', '900': 'bg-accent-900',
};

const CHART_DATA = [
  { mes: 'Jun', turnos: 820 }, { mes: 'Jul', turnos: 910 }, { mes: 'Ago', turnos: 870 },
  { mes: 'Sep', turnos: 1010 }, { mes: 'Oct', turnos: 1080 }, { mes: 'Nov', turnos: 1150 },
];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  useDocumentTitle('Sistema de diseño');
  const { toast } = useToast();
  const modal = useDisclosure();
  const [dni, setDni] = useState('');
  const dniError = dni && !/^\d{7,8}$/.test(dni) ? 'Ingrese entre 7 y 8 dígitos, sin puntos.' : undefined;
  const now = new Date();

  return (
    <div className="min-h-screen bg-surface">
      <DemoBanner />
      <header className="sticky top-0 z-30 flex h-topbar items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur sm:px-8">
        <Logo />
        <Link to="/acceso" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Volver al acceso</span>
        </Link>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-8">
        <div>
          <Badge variant="accent" dot>Fase 1</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sistema de diseño</h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Tokens visuales y componentes reutilizables que comparten el Panel Administrativo, el Panel Médico y el Chatbot.
          </p>
        </div>

        <Section title="Paleta de colores" description="Azul petróleo para estructura y acciones; verde azulado para destacados.">
          <Card>
            <CardContent className="space-y-5">
              {[
                { name: 'Primary · azul petróleo', classes: PRIMARY_CLASSES },
                { name: 'Accent · verde azulado', classes: ACCENT_CLASSES },
              ].map(({ name, classes }) => (
                <div key={name}>
                  <p className="mb-2 text-sm font-medium text-slate-700">{name}</p>
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {PRIMARY.map((shade) => (
                      <div key={shade} className="text-center">
                        <div className={`h-12 rounded-lg ring-1 ring-inset ring-black/5 ${classes[shade]}`} />
                        <span className="mt-1 block text-[11px] text-slate-500">{shade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-2"><span className="h-6 w-6 rounded border border-line bg-surface" /> Fondo · #F4F7F8</span>
                <span className="flex items-center gap-2"><span className="h-6 w-6 rounded border border-line bg-white" /> Tarjeta · #FFFFFF</span>
                <span className="flex items-center gap-2"><span className="h-6 w-6 rounded bg-line" /> Borde · #E5ECEE</span>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Tipografía" description="Inter Variable · escala 12 / 14 / 16 / 20 / 24 / 30.">
          <Card>
            <CardContent className="space-y-2">
              <p className="text-3xl font-semibold tracking-tight text-slate-900">Título principal 30</p>
              <p className="text-2xl font-semibold text-slate-900">Título de página 24</p>
              <p className="text-xl font-semibold text-slate-900">Subtítulo 20</p>
              <p className="text-base text-slate-700">Texto base 16 — Seguimiento integral del paciente oncológico.</p>
              <p className="text-sm text-slate-600">Texto secundario 14 — utilizado en tablas y formularios.</p>
              <p className="text-xs text-slate-500">Texto auxiliar 12 — ayudas y metadatos.</p>
            </CardContent>
          </Card>
        </Section>

        <Section title="Botones">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Nuevo turno</Button>
              <Button variant="accent">Confirmar</Button>
              <Button variant="secondary">Secundario</Button>
              <Button variant="outline">Exportar</Button>
              <Button variant="ghost">Cancelar</Button>
              <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>Eliminar</Button>
              <Button loading>Guardando</Button>
              <Button size="sm">Pequeño</Button>
              <Button size="lg">Grande</Button>
            </CardContent>
          </Card>
        </Section>

        <Section title="Estados y etiquetas">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Badge variant="success" dot>Confirmado</Badge>
              <Badge variant="warning" dot>Pendiente</Badge>
              <Badge variant="danger" dot>Cancelado</Badge>
              <Badge variant="info" dot>En espera</Badge>
              <Badge variant="primary">Oncología clínica</Badge>
              <Badge variant="accent">WhatsApp</Badge>
              <Badge>Particular</Badge>
              <span className="mx-2 h-6 w-px bg-line" />
              <Avatar name="Ana Gómez" size="sm" />
              <Avatar name="Martín Ferreyra" />
              <Avatar name="Lucía Benítez" size="lg" />
              <Spinner />
            </CardContent>
          </Card>
        </Section>

        <Section title="Formularios" description="Validación en vivo y formatos argentinos.">
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Buscar" placeholder="Paciente, DNI o afiliado" leftIcon={<Search />} />
              <Input
                label="DNI"
                placeholder="30123456"
                inputMode="numeric"
                value={dni}
                onChange={(e) => setDni(e.target.value.trim())}
                error={dniError}
                hint={dni && !dniError ? `Formato: ${formatDNI(dni)}` : 'Solo números (dato ficticio)'}
                required
              />
              <Select
                label="Cobertura"
                placeholder="Seleccionar obra social / prepaga"
                options={coverages.map((c) => ({ value: c.id, label: c.name }))}
              />
            </CardContent>
            <div className="grid gap-3 border-t border-line px-5 py-4 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <p><span className="block text-xs text-slate-400">Fecha</span>{formatDate(now)}</p>
              <p><span className="block text-xs text-slate-400">Hora</span>{formatTime(now)}</p>
              <p><span className="block text-xs text-slate-400">Fecha extendida</span>{formatLongDate(now)}</p>
              <p><span className="block text-xs text-slate-400">Teléfono</span>{formatPhoneAR('5491140000101')}</p>
            </div>
          </Card>
        </Section>

        <Section title="Indicadores y gráficos">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Turnos de hoy" value="86" icon={CalendarCheck2} trend={{ value: '+12%', positive: true }} hint="vs. semana anterior" />
            <StatCard label="Pacientes activos" value="1.248" icon={Users} tone="accent" trend={{ value: '+4%', positive: true }} />
            <StatCard label="Solicitudes pendientes" value="23" icon={ClipboardList} tone="amber" hint="7 con prioridad alta" />
            <StatCard label="Ausentismo" value="6,8%" icon={UserX} tone="rose" trend={{ value: '-1,2%', positive: true }} />
          </div>
          <Card>
            <CardHeader title="Turnos mensuales" description="Datos ficticios · últimos 6 meses" />
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CHART_DATA} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ds-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5ECEE" vertical={false} />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5ECEE', fontSize: 13 }} />
                  <Area type="monotone" dataKey="turnos" stroke="#0F4C5C" strokeWidth={2} fill="url(#ds-area)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Section>

        <Section title="Interacciones" description="Modales, notificaciones y estados vacíos.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="flex flex-wrap gap-3">
                <Button onClick={modal.open}>Abrir modal</Button>
                <Button variant="outline" onClick={() => toast({ title: 'Turno confirmado', description: 'Se notificó al paciente por WhatsApp.', variant: 'success' })}>
                  Toast de éxito
                </Button>
                <Button variant="outline" onClick={() => toast({ title: 'Atención', description: 'El profesional no tiene agenda ese día.', variant: 'warning' })}>
                  Toast de advertencia
                </Button>
              </CardContent>
            </Card>
            <Card>
              <EmptyState icon={Search} title="Sin resultados" description="No se encontraron pacientes con los filtros aplicados." />
            </Card>
          </div>
        </Section>
      </main>

      <Modal
        open={modal.isOpen}
        onClose={modal.close}
        title="Cancelar turno"
        description="Esta acción notificará al paciente."
        footer={
          <>
            <Button variant="ghost" onClick={modal.close}>Volver</Button>
            <Button
              variant="danger"
              onClick={() => {
                modal.close();
                toast({ title: 'Turno cancelado', variant: 'danger' });
              }}
            >
              Cancelar turno
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          ¿Confirma la cancelación del turno de <strong>Ana Gómez</strong> (paciente ficticia) del {formatDate(now)}?
        </p>
      </Modal>
    </div>
  );
}
