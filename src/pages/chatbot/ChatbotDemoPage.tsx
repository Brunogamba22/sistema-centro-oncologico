import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, MessageCircle, ShieldCheck, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, EmptyState, PageLoader } from '@/components/ui';
import { useToast } from '@/context/toast/useToast';
import { ChatPanelColumn } from '@/features/chatbot/components/ChatPanelColumn';
import { ConversationListColumn } from '@/features/chatbot/components/ConversationListColumn';
import { HumanHandoffModal } from '@/features/chatbot/components/HumanHandoffModal';
import { PatientContextColumn } from '@/features/chatbot/components/PatientContextColumn';
import {
  buildMainMenuActions,
  createInitialMessagesForNewChat,
  createSessionForConversation,
  processPatientTurn,
} from '@/features/chatbot/engine';
import type { ChatAttachment, ConversationSession } from '@/features/chatbot/types';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  agendaService,
  appointmentsService,
  catalogService,
  doctorsService,
  documentsService,
  medicalRequestsService,
  patientHistoryService,
  patientsService,
  settingsService,
  whatsappService,
} from '@/services';
import type { WhatsAppConversation } from '@/types';

type MobilePane = 'list' | 'chat' | 'patient';

export default function ChatbotDemoPage() {
  useDocumentTitle('Chatbot WhatsApp');
  const { toast } = useToast();

  const { data, loading, reload } = useAsync(async () => {
    const [
      conversations,
      patients,
      doctors,
      specialties,
      coverages,
      appointments,
      blocks,
      requests,
      documents,
      history,
      sites,
    ] = await Promise.all([
      whatsappService.list(),
      patientsService.list(),
      doctorsService.list(),
      catalogService.listSpecialties(),
      catalogService.listCoverages(),
      appointmentsService.list(),
      agendaService.listBlocks(),
      medicalRequestsService.list(),
      documentsService.listAll(),
      patientHistoryService.listAll(),
      settingsService.listSites(),
    ]);

    return {
      conversations,
      patients,
      doctors,
      specialties,
      coverages,
      appointments,
      blocks,
      requests,
      documents,
      history,
      sites,
    };
  }, []);

  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');
  const [sending, setSending] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>('chat');

  const [sessions, setSessions] = useState<Record<string, ConversationSession>>({});
  const [attachments, setAttachments] = useState<Record<string, ChatAttachment>>({});
  const seededWelcomeRef = useRef(false);

  // Garantiza una conversación inicial sin verificar para probar el Flujo 1 de inmediato
  useEffect(() => {
    if (!data || seededWelcomeRef.current) return;
    seededWelcomeRef.current = true;

    const existingUnverified = data.conversations.find((c) => !c.patientId);
    if (existingUnverified) {
      setSelectedId((prev) => prev || existingUnverified.id);
      return;
    }

    const createWelcomeChat = async () => {
      const created = await whatsappService.createConversation({
        patientId: '',
        phone: '5491140009901',
        initialMessages: createInitialMessagesForNewChat(),
        tags: ['Bot activo', 'Verificación'],
      });
      setSessions((prev) => ({
        ...prev,
        [created.id]: createSessionForConversation(created, false),
      }));
      setSelectedId(created.id);
      await reload();
    };

    void createWelcomeChat();
  }, [data, reload]);

  // Inicializa sesiones de conversaciones cargadas que aún no estén en estado local
  useEffect(() => {
    if (!data) return;
    setSessions((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const conv of data.conversations) {
        if (!next[conv.id]) {
          next[conv.id] = createSessionForConversation(conv, Boolean(conv.patientId));
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    if (!selectedId && data.conversations.length > 0) {
      setSelectedId(data.conversations[0].id);
    }
  }, [data, selectedId]);

  const patientMap = useMemo(() => new Map(data?.patients.map((p) => [p.id, p]) ?? []), [data?.patients]);
  const coverageMap = useMemo(() => new Map(data?.coverages.map((c) => [c.id, c]) ?? []), [data?.coverages]);
  const doctorMap = useMemo(() => new Map(data?.doctors.map((d) => [d.id, d]) ?? []), [data?.doctors]);
  const specialtyMap = useMemo(() => new Map(data?.specialties.map((s) => [s.id, s]) ?? []), [data?.specialties]);

  const filteredConversations = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.conversations.filter((conv) => {
      if (statusFilter !== 'todas' && conv.status !== statusFilter) return false;
      if (q) {
        const isVerified = sessions[conv.id]?.verified ?? false;
        const patient = isVerified && conv.patientId ? patientMap.get(conv.patientId) : undefined;
        const text = `${patient?.firstName ?? ''} ${patient?.lastName ?? ''} ${patient?.dni ?? ''} ${conv.phone} ${conv.tags.join(' ')}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, statusFilter, patientMap, sessions]);

  const activeConv = useMemo(
    () => data?.conversations.find((c) => c.id === selectedId) ?? filteredConversations[0] ?? null,
    [data?.conversations, selectedId, filteredConversations],
  );

  const activeSession: ConversationSession | undefined = useMemo(() => {
    if (!activeConv) return undefined;
    return sessions[activeConv.id] ?? createSessionForConversation(activeConv, Boolean(activeConv.patientId));
  }, [activeConv, sessions]);

  const activePatient =
    activeConv && activeSession?.verified && activeSession.verifiedPatientId
      ? patientMap.get(activeSession.verifiedPatientId)
      : undefined;

  const activeCoverage = activePatient ? coverageMap.get(activePatient.coverage.coverageId) : undefined;
  const activeDoctor = activePatient?.assignedDoctorId ? doctorMap.get(activePatient.assignedDoctorId) : undefined;

  const patientAppointments = useMemo(() => {
    if (!data || !activePatient) return [];
    return data.appointments
      .filter((a) => a.patientId === activePatient.id)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  }, [data, activePatient]);

  const patientRequests = useMemo(() => {
    if (!data || !activePatient) return [];
    return data.requests
      .filter((r) => r.patientId === activePatient.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data, activePatient]);

  const patientDocuments = useMemo(() => {
    if (!data || !activePatient) return [];
    return data.documents.filter((d) => d.patientId === activePatient.id);
  }, [data, activePatient]);

  const patientHistory = useMemo(() => {
    if (!data || !activePatient) return [];
    return data.history.filter((h) => h.patientId === activePatient.id);
  }, [data, activePatient]);

  const handleSelectConversation = useCallback(
    async (conv: WhatsAppConversation) => {
      setSelectedId(conv.id);
      setMobilePane('chat');
      if (conv.unreadCount > 0) {
        await whatsappService.markRead(conv.id);
        await reload();
      }
    },
    [reload],
  );

  const handleNewConversation = useCallback(async () => {
    const suffix = String(Math.floor(1000 + Math.random() * 8999));
    const created = await whatsappService.createConversation({
      patientId: '',
      phone: `549114000${suffix}`,
      initialMessages: createInitialMessagesForNewChat(),
      tags: ['Bot activo', 'Verificación'],
    });
    setSessions((prev) => ({
      ...prev,
      [created.id]: createSessionForConversation(created, false),
    }));
    setSelectedId(created.id);
    setMobilePane('chat');
    await reload();
    toast({
      title: 'Nueva conversación iniciada',
      description: 'Podés probar el Flujo 1 de bienvenida e identificación con DNI y fecha de nacimiento.',
      variant: 'info',
    });
  }, [reload, toast]);

  const handleSendPatientText = useCallback(
    async (text: string, options?: { displayLabel?: string; attachment?: ChatAttachment }) => {
      if (!data || !activeConv || !activeSession) return;
      setSending(true);
      try {
        const outcome = await processPatientTurn(
          {
            conversation: activeConv,
            patients: data.patients,
            doctors: data.doctors,
            specialties: data.specialties,
            coverages: data.coverages,
            appointments: data.appointments,
            blocks: data.blocks,
            sites: data.sites,
          },
          activeSession,
          text,
          options,
        );

        await whatsappService.appendMessages(activeConv.id, outcome.messages, outcome.conversationPatch);

        if (outcome.attachments && Object.keys(outcome.attachments).length > 0) {
          setAttachments((prev) => ({ ...prev, ...outcome.attachments }));
        }

        setSessions((prev) => ({
          ...prev,
          [activeConv.id]: outcome.nextSession,
        }));

        if (outcome.toast) {
          toast(outcome.toast);
        }

        await reload();
      } finally {
        setSending(false);
      }
    },
    [data, activeConv, activeSession, reload, toast],
  );

  const handleSendOperatorText = useCallback(
    async (text: string) => {
      if (!activeConv) return;
      setSending(true);
      try {
        const operatorName = activeConv.assignedTo ?? 'Lucía Benítez';
        await whatsappService.sendMessage(activeConv.id, text, operatorName);
        await reload();
      } finally {
        setSending(false);
      }
    },
    [activeConv, reload],
  );

  const handleToggleBot = useCallback(async () => {
    if (!activeConv || !activeSession) return;
    const updated = await whatsappService.toggleBot(activeConv.id);

    if (updated.botEnabled) {
      const nextSession: ConversationSession = activeSession.verified
        ? { ...activeSession, flow: 'menu', step: 'idle', quickActions: buildMainMenuActions() }
        : { ...activeSession, flow: 'bienvenida', step: 'ask_dni', quickActions: [] };

      setSessions((prev) => ({ ...prev, [activeConv.id]: nextSession }));

      await whatsappService.appendMessages(activeConv.id, [
        {
          id: `wa-resume-${Date.now()}`,
          sender: 'bot',
          senderName: 'Asistente COI',
          text: activeSession.verified
            ? '¡Hola de nuevo! El asistente virtual fue reactivado. Elegí una opción del menú para continuar:'
            : 'El asistente virtual fue reactivado. Para continuar, ingresá tu número de DNI sin puntos.',
          sentAt: new Date().toISOString(),
        },
      ]);
    } else {
      setSessions((prev) => ({
        ...prev,
        [activeConv.id]: { ...activeSession, flow: 'atencion_humana', step: 'handed_off', quickActions: [] },
      }));
    }

    toast({
      title: updated.botEnabled ? 'Bot retomado' : 'Bot pausado',
      description: updated.botEnabled
        ? 'El asistente virtual volvió a responder automáticamente.'
        : 'Podés responder como operador humano desde el campo inferior.',
      variant: 'info',
    });
    await reload();
  }, [activeConv, activeSession, reload, toast]);

  const handleTransferConfirm = useCallback(
    async (department: WhatsAppConversation['department'], operator?: string) => {
      if (!activeConv || !activeSession) return;
      const updated = await whatsappService.transferTo(activeConv.id, department, operator);
      setHandoffOpen(false);

      if (updated.botEnabled) {
        setSessions((prev) => ({
          ...prev,
          [activeConv.id]: activeSession.verified
            ? { ...activeSession, flow: 'menu', step: 'idle', quickActions: buildMainMenuActions() }
            : { ...activeSession, flow: 'bienvenida', step: 'ask_dni', quickActions: [] },
        }));
      } else {
        setSessions((prev) => ({
          ...prev,
          [activeConv.id]: { ...activeSession, flow: 'atencion_humana', step: 'handed_off', quickActions: [] },
        }));
      }

      toast({
        title: 'Atención actualizada',
        description:
          department === 'Asistente virtual'
            ? 'Conversación devuelta al asistente virtual.'
            : `Derivada a ${department}${operator ? ` · Operador: ${operator}` : ''}.`,
        variant: 'success',
      });
      await reload();
    },
    [activeConv, activeSession, reload, toast],
  );

  const handleResolve = useCallback(async () => {
    if (!activeConv) return;
    await whatsappService.resolve(activeConv.id, activeConv.assignedTo ?? 'Recepción');
    setHandoffOpen(false);
    toast({
      title: 'Conversación resuelta',
      description: 'La conversación quedó marcada como resuelta en el sistema.',
      variant: 'success',
    });
    await reload();
  }, [activeConv, reload, toast]);

  const handleResetConversation = useCallback(async () => {
    if (!activeConv) return;
    const freshMessages = createInitialMessagesForNewChat();
    await whatsappService.resetConversation(activeConv.id, freshMessages, '');
    setSessions((prev) => ({
      ...prev,
      [activeConv.id]: {
        verified: false,
        verificationAttempts: 0,
        flow: 'bienvenida',
        step: 'ask_dni',
        quickActions: [],
        booking: {},
        manage: {},
        prescription: {},
        document: {},
      },
    }));
    toast({
      title: 'Flujo reiniciado',
      description: 'La conversación volvió al inicio (Flujo 1: Bienvenida y verificación de identidad).',
      variant: 'info',
    });
    await reload();
  }, [activeConv, reload, toast]);

  if (loading || !data) return <PageLoader />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chatbot interactivo de WhatsApp"
        description="Experiencia simulada tipo WhatsApp Web conectada a los servicios mock de turnos, solicitudes y documentación."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent" dot>
              6 flujos activos
            </Badge>
            <Badge variant="neutral">
              <ShieldCheck className="mr-1 h-3.5 w-3.5 text-primary-700" />
              Entorno demo · Sin WhatsApp API real
            </Badge>
          </div>
        }
      />

      {/* Navegación móvil entre columnas */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-white p-1 text-xs font-medium lg:hidden">
        {(
          [
            { id: 'list', label: 'Chats', icon: MessageCircle },
            { id: 'chat', label: 'Conversación', icon: Bot },
            { id: 'patient', label: 'Paciente', icon: UserRound },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePane(id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              mobilePane === id ? 'bg-primary-700 text-white' : 'text-slate-600'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Interfaz principal estilo WhatsApp Web de 3 columnas */}
      <div className="grid h-[calc(100vh-205px)] min-h-[600px] max-h-[820px] grid-cols-1 overflow-hidden rounded-2xl border border-line bg-white shadow-card lg:grid-cols-[290px_minmax(0,1fr)_305px] xl:grid-cols-[315px_minmax(0,1fr)_325px]">
        {/* Columna 1: Conversaciones */}
        <div className={`min-h-0 ${mobilePane === 'list' ? 'block' : 'hidden'} lg:block`}>
          <ConversationListColumn
            conversations={filteredConversations}
            selectedId={activeConv?.id ?? ''}
            search={search}
            statusFilter={statusFilter}
            patientMap={patientMap}
            sessions={sessions}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onSelect={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />
        </div>

        {/* Columna 2: Chat */}
        <div className={`min-h-0 ${mobilePane === 'chat' ? 'block' : 'hidden'} lg:block`}>
          {activeConv && activeSession ? (
            <ChatPanelColumn
              conversation={activeConv}
              patient={activePatient}
              session={activeSession}
              attachments={attachments}
              sending={sending}
              onSendPatientText={handleSendPatientText}
              onSendOperatorText={handleSendOperatorText}
              onToggleBot={handleToggleBot}
              onOpenHandoffModal={() => setHandoffOpen(true)}
              onResetConversation={handleResetConversation}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#EFEAE2] p-6">
              <EmptyState
                icon={MessageCircle}
                title="Seleccioná una conversación"
                description="Elegí un chat de la columna izquierda o iniciá uno nuevo para probar el asistente virtual."
              />
            </div>
          )}
        </div>

        {/* Columna 3: Paciente */}
        <div className={`min-h-0 ${mobilePane === 'patient' ? 'block' : 'hidden'} lg:block`}>
          <PatientContextColumn
            verified={Boolean(activeSession?.verified)}
            patient={activePatient}
            coverage={activeCoverage}
            assignedDoctor={activeDoctor}
            appointments={patientAppointments}
            requests={patientRequests}
            documents={patientDocuments}
            history={patientHistory}
            doctorMap={doctorMap}
            specialtyMap={specialtyMap}
            onQuickFillTestText={(val) => {
              setMobilePane('chat');
              void handleSendPatientText(val);
            }}
          />
        </div>
      </div>

      {/* Modal de atención humana */}
      {activeConv && (
        <HumanHandoffModal
          key={`${activeConv.id}-${handoffOpen}`}
          open={handoffOpen}
          conversation={activeConv}
          onClose={() => setHandoffOpen(false)}
          onConfirmTransfer={handleTransferConfirm}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}
