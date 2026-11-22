import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightLeft,
  Bot,
  CalendarClock,
  CheckCheck,
  ExternalLink,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar, Badge, Button, Card, EmptyState, Input, Modal, PageLoader, Select } from '@/components/ui';
import { APPOINTMENT_STATUS_META, WHATSAPP_STATUS_META } from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { useAsync } from '@/hooks/useAsync';
import {
  appointmentsService,
  catalogService,
  doctorsService,
  patientsService,
  whatsappService,
} from '@/services';
import type { WhatsAppConversation, WhatsAppConversationStatus } from '@/types';
import { formatDate, formatDNI, formatPhoneAR, formatTime } from '@/utils/format';

const QUICK_REPLIES = [
  'Hola, recibimos tu mensaje. Ya verificamos tu consulta en el sistema.',
  'Tu turno quedó confirmado. Recordá presentar DNI y credencial vigente.',
  'Tu receta fue derivada al profesional; te avisaremos apenas esté disponible.',
];

const DEPARTMENTS: WhatsAppConversation['department'][] = [
  'Recepción',
  'Turnos',
  'Documentación',
  'Asistente virtual',
];

const AGENTS = ['Lucía Benítez', 'Sofía Pereyra', 'Mariana Sosa', 'Federico Alarcón'];

export default function WhatsAppInboxPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data, loading, reload } = useAsync(async () => {
    const [conversations, patients, coverages, doctors, appointments] = await Promise.all([
      whatsappService.list(),
      patientsService.list(),
      catalogService.listCoverages(),
      doctorsService.list(),
      appointmentsService.list(),
    ]);
    return { conversations, patients, coverages, doctors, appointments };
  }, []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todas');
  const [selectedId, setSelectedId] = useState<string>('wa-001');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferDept, setTransferDept] = useState<WhatsAppConversation['department']>('Turnos');
  const [transferAgent, setTransferAgent] = useState('');

  const patientMap = useMemo(() => new Map(data?.patients.map((p) => [p.id, p]) ?? []), [data?.patients]);
  const coverageMap = useMemo(() => new Map(data?.coverages.map((c) => [c.id, c]) ?? []), [data?.coverages]);
  const doctorMap = useMemo(() => new Map(data?.doctors.map((d) => [d.id, d]) ?? []), [data?.doctors]);

  const filteredConversations = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.conversations.filter((conv) => {
      if (statusFilter !== 'todas' && conv.status !== statusFilter) return false;
      if (q) {
        const patient = patientMap.get(conv.patientId);
        const text = `${patient?.firstName ?? ''} ${patient?.lastName ?? ''} ${patient?.dni ?? ''} ${conv.phone} ${conv.tags.join(' ')}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, statusFilter, patientMap]);

  const activeConv = useMemo(
    () => data?.conversations.find((c) => c.id === selectedId) ?? filteredConversations[0] ?? null,
    [data?.conversations, selectedId, filteredConversations],
  );

  const activePatient = activeConv ? patientMap.get(activeConv.patientId) : undefined;
  const activeCoverage = activePatient ? coverageMap.get(activePatient.coverage.coverageId) : undefined;
  const activeDoctor = activePatient?.assignedDoctorId ? doctorMap.get(activePatient.assignedDoctorId) : undefined;

  const patientAppointments = useMemo(() => {
    if (!data || !activePatient) return [];
    return data.appointments
      .filter((a) => a.patientId === activePatient.id)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
      .slice(0, 3);
  }, [data, activePatient]);

  const handleSelectConversation = async (conv: WhatsAppConversation) => {
    setSelectedId(conv.id);
    if (conv.unreadCount > 0) {
      await whatsappService.markRead(conv.id);
      await reload();
    }
  };

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeConv || !draft.trim()) return;
    setSending(true);
    try {
      await whatsappService.sendMessage(activeConv.id, draft, user?.name ?? 'Recepción');
      setDraft('');
      await reload();
    } finally {
      setSending(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!activeConv) return;
    await whatsappService.assignTo(activeConv.id, user?.name ?? 'Recepción');
    toast({
      title: 'Conversación asignada',
      description: `Tomaste la atención de ${activePatient ? `${activePatient.lastName}, ${activePatient.firstName}` : activeConv.phone}.`,
      variant: 'success',
    });
    await reload();
  };

  const handleToggleBot = async () => {
    if (!activeConv) return;
    const updated = await whatsappService.toggleBot(activeConv.id);
    toast({
      title: updated.botEnabled ? 'Atención automática activada' : 'Atención automática pausada',
      description: updated.botEnabled
        ? 'El asistente virtual responderá automáticamente al paciente.'
        : 'La conversación quedó disponible para respuesta humana.',
      variant: 'info',
    });
    await reload();
  };

  const handleTransfer = async () => {
    if (!activeConv) return;
    await whatsappService.transferTo(activeConv.id, transferDept, transferAgent || undefined);
    setTransferOpen(false);
    setTransferAgent('');
    toast({
      title: 'Conversación transferida',
      description: `Derivada a ${transferDept}${transferAgent ? ` (${transferAgent})` : ''}.`,
      variant: 'info',
    });
    await reload();
  };

  const handleResolve = async () => {
    if (!activeConv) return;
    await whatsappService.resolve(activeConv.id, user?.name ?? 'Recepción');
    toast({ title: 'Conversación resuelta', description: 'Se cerró la gestión actual en la bandeja.', variant: 'success' });
    await reload();
  };

  const handleSimulateReply = async () => {
    if (!activeConv) return;
    const name = activePatient ? `${activePatient.firstName} ${activePatient.lastName}` : 'Paciente';
    await whatsappService.simulateIncomingReply(activeConv.id, name);
    toast({
      title: activeConv.botEnabled ? 'Respuesta simulada + respuesta automática del Bot' : 'Mensaje entrante simulado',
      description: activeConv.botEnabled
        ? 'El asistente virtual respondió automáticamente porque el modo Bot está activo.'
        : 'Se recibió un nuevo mensaje simulado del paciente.',
      variant: 'info',
    });
    await reload();
  };

  if (loading || !data) return <PageLoader />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bandeja de WhatsApp"
        description="Atención omnicanal simulada con asistente virtual, asignaciones y transferencias a recepción."
        actions={
          <Badge variant="accent" dot>
            Entorno simulado · Sin envío real
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12" style={{ minHeight: '640px' }}>
        {/* Columna 1: Conversaciones */}
        <Card className="flex flex-col overflow-hidden lg:col-span-4 xl:col-span-3">
          <div className="space-y-3 border-b border-line p-3.5">
            <Input
              placeholder="Buscar paciente o teléfono…"
              leftIcon={<Search />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'todas', label: 'Todas' },
                  { id: 'espera_humano', label: 'En espera' },
                  { id: 'en_atencion', label: 'En atención' },
                  { id: 'bot', label: 'Bot' },
                  { id: 'resuelta', label: 'Resueltas' },
                ] as { id: string; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    statusFilter === tab.id
                      ? 'bg-primary-700 text-white'
                      : 'bg-surface text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="scrollbar-thin flex-1 divide-y divide-line overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">Sin conversaciones con este filtro.</p>
            ) : (
              filteredConversations.map((conv) => {
                const patient = patientMap.get(conv.patientId);
                const lastMsg = conv.messages[conv.messages.length - 1];
                const statusMeta = WHATSAPP_STATUS_META[conv.status as WhatsAppConversationStatus];
                const isSelected = activeConv?.id === conv.id;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-3.5 text-left transition ${
                      isSelected ? 'bg-primary-50/70' : 'hover:bg-surface/70'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar name={patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {patient ? `${patient.lastName}, ${patient.firstName}` : formatPhoneAR(conv.phone)}
                          </p>
                          <span className="shrink-0 text-[11px] text-slate-400">{formatTime(conv.lastMessageAt)}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{lastMsg?.text ?? ''}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                          {conv.unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1.5 text-[11px] font-semibold text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Columna 2: Chat */}
        <Card className="flex flex-col overflow-hidden lg:col-span-8 xl:col-span-6">
          {!activeConv ? (
            <EmptyState
              icon={MessageCircle}
              title="Seleccioná una conversación"
              description="Elegí un chat de la columna izquierda para responder o gestionar la atención."
            />
          ) : (
            <>
              {/* Header del chat */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={activePatient ? `${activePatient.firstName} ${activePatient.lastName}` : 'Paciente'}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {activePatient ? `${activePatient.lastName}, ${activePatient.firstName}` : formatPhoneAR(activeConv.phone)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {activeConv.department}
                      {activeConv.assignedTo ? ` · Asignada a ${activeConv.assignedTo}` : ' · Sin agente asignado'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button variant="outline" size="sm" leftIcon={<UserCheck className="h-3.5 w-3.5" />} onClick={handleAssignToMe}>
                    Tomar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setTransferDept(activeConv.department);
                      setTransferOpen(true);
                    }}
                  >
                    Transferir
                  </Button>
                  <Button
                    variant={activeConv.botEnabled ? 'secondary' : 'outline'}
                    size="sm"
                    leftIcon={<Bot className="h-3.5 w-3.5" />}
                    onClick={handleToggleBot}
                  >
                    {activeConv.botEnabled ? 'Bot ON' : 'Bot OFF'}
                  </Button>
                  {activeConv.status !== 'resuelta' && (
                    <Button variant="ghost" size="sm" leftIcon={<CheckCheck className="h-3.5 w-3.5" />} onClick={handleResolve}>
                      Resolver
                    </Button>
                  )}
                </div>
              </div>

              {/* Mensajes */}
              <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto bg-surface/60 p-4">
                {activeConv.messages.map((msg) => {
                  if (msg.sender === 'sistema') {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-medium text-slate-600">
                          {msg.text} · {formatTime(msg.sentAt)}
                        </span>
                      </div>
                    );
                  }
                  const isPatient = msg.sender === 'paciente';
                  const isBot = msg.sender === 'bot';
                  return (
                    <div key={msg.id} className={`flex ${isPatient ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-xs ${
                          isPatient
                            ? 'rounded-tl-sm border border-line bg-white text-slate-800'
                            : isBot
                              ? 'rounded-tr-sm bg-accent-600 text-white'
                              : 'rounded-tr-sm bg-primary-700 text-white'
                        }`}
                      >
                        <p
                          className={`mb-1 flex items-center gap-1 text-[11px] font-semibold ${
                            isPatient ? 'text-primary-700' : 'text-white/80'
                          }`}
                        >
                          {isBot && <Bot className="h-3 w-3" />}
                          {msg.senderName}
                        </p>
                        <p className="leading-relaxed">{msg.text}</p>
                        <p className={`mt-1 text-right text-[10px] ${isPatient ? 'text-slate-400' : 'text-white/70'}`}>
                          {formatTime(msg.sentAt)} hs
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Respuestas rápidas + Input */}
              <div className="space-y-2.5 border-t border-line bg-white p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REPLIES.map((qr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDraft(qr)}
                        className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-primary-300 hover:text-primary-800"
                      >
                        Plantilla {idx + 1}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                    onClick={handleSimulateReply}
                  >
                    Simular mensaje paciente
                  </Button>
                </div>

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <Input
                    placeholder="Escribí una respuesta al paciente…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <Button type="submit" loading={sending} rightIcon={<Send className="h-4 w-4" />}>
                    Enviar
                  </Button>
                </form>
              </div>
            </>
          )}
        </Card>

        {/* Columna 3: Información del paciente */}
        <Card className="flex flex-col overflow-hidden lg:col-span-12 xl:col-span-3">
          {!activePatient ? (
            <div className="p-5 text-xs text-slate-500">Sin datos del paciente seleccionado.</div>
          ) : (
            <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-4">
              <div className="flex items-center gap-3">
                <Avatar name={`${activePatient.firstName} ${activePatient.lastName}`} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {activePatient.lastName}, {activePatient.firstName}
                  </p>
                  <p className="text-xs text-slate-500">DNI {formatDNI(activePatient.dni)}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-line bg-surface/60 p-3 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Teléfono</span>
                  <span className="font-medium text-slate-800">{formatPhoneAR(activePatient.phone)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Cobertura</span>
                  <span className="font-medium text-slate-800">
                    {activeCoverage?.name ?? 'Particular'}
                    {activePatient.coverage.plan ? ` · ${activePatient.coverage.plan}` : ''}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Afiliado</span>
                  <span className="font-medium text-slate-800">{activePatient.coverage.affiliateNumber}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Cabecera</span>
                  <span className="font-medium text-slate-800">
                    {activeDoctor ? `${activeDoctor.title} ${activeDoctor.lastName}` : 'Sin asignar'}
                  </span>
                </div>
              </div>

              <Link
                to={`/admin/pacientes/${activePatient.id}`}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-primary-700 transition hover:bg-primary-50"
              >
                Abrir ficha administrativa <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              {activeConv && activeConv.tags.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Etiquetas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeConv.tags.map((tag) => (
                      <Badge key={tag} variant="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <CalendarClock className="h-3.5 w-3.5" /> Turnos recientes
                </p>
                {patientAppointments.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin turnos registrados.</p>
                ) : (
                  <ul className="space-y-2">
                    {patientAppointments.map((apt) => {
                      const doc = doctorMap.get(apt.doctorId);
                      const statusMeta = APPOINTMENT_STATUS_META[apt.status];
                      return (
                        <li key={apt.id} className="rounded-lg border border-line p-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800">
                              {formatDate(apt.startAt)} · {formatTime(apt.startAt)}
                            </span>
                            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                          </div>
                          <p className="mt-1 text-slate-500">
                            {doc ? `${doc.title} ${doc.lastName}` : 'Profesional'}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modal Transferir */}
      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        size="sm"
        title="Transferir conversación"
        description="Derivá la atención a otro sector o nuevamente al Asistente virtual."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTransferOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTransfer}>Confirmar transferencia</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Área de destino"
            value={transferDept}
            onChange={(e) => setTransferDept(e.target.value as WhatsAppConversation['department'])}
            options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
          />
          {transferDept !== 'Asistente virtual' && (
            <Select
              label="Operador asignado (opcional)"
              placeholder="Dejar en cola del área"
              value={transferAgent}
              onChange={(e) => setTransferAgent(e.target.value)}
              options={AGENTS.map((a) => ({ value: a, label: a }))}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
