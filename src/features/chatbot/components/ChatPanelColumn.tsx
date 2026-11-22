import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Bot,
  CheckCheck,
  FileText,
  Headset,
  Image as ImageIcon,
  Lock,
  Paperclip,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Avatar, Badge, Button, Input } from '@/components/ui';
import { BRAND } from '@/config/brand';
import type { Patient, WhatsAppConversation } from '@/types';
import { formatPhoneAR, formatTime } from '@/utils/format';
import type { ChatAttachment, ChatQuickAction, ConversationSession } from '../types';

interface ChatPanelColumnProps {
  conversation: WhatsAppConversation;
  patient: Patient | undefined;
  session: ConversationSession;
  attachments: Record<string, ChatAttachment>;
  sending: boolean;
  onSendPatientText: (text: string, options?: { displayLabel?: string; attachment?: ChatAttachment }) => void;
  onSendOperatorText: (text: string) => void;
  onToggleBot: () => void;
  onOpenHandoffModal: () => void;
  onResetConversation: () => void;
}

const SIMULATED_ATTACHMENTS: ChatAttachment[] = [
  { name: 'Estudio_Laboratorio_Control.pdf', fileType: 'pdf', sizeKb: 490, categoryLabel: 'Estudio' },
  { name: 'Derivacion_Oncologia.pdf', fileType: 'pdf', sizeKb: 380, categoryLabel: 'Derivación' },
  { name: 'Foto_Receta_Anterior.jpg', fileType: 'imagen', sizeKb: 520, categoryLabel: 'Receta' },
  { name: 'Informe_Anatomia_Patologica.pdf', fileType: 'pdf', sizeKb: 740, categoryLabel: 'Informe' },
];

/** Renderiza negritas (**), cursivas (_) y código (`) de forma segura sin HTML crudo. */
function renderFormattedLine(line: string): ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  const parts = line.split(tokenRegex);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(1, -1)}
        </strong>
      );
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return (
        <em key={idx} className="italic text-slate-600">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={idx} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-primary-800">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

function FormattedMessageText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-[13.5px] leading-relaxed text-slate-800">
      {lines.map((line, i) => (
        <p key={i} className={line === '' ? 'h-1.5' : ''}>
          {renderFormattedLine(line)}
        </p>
      ))}
    </div>
  );
}

export function ChatPanelColumn({
  conversation,
  patient,
  session,
  attachments,
  sending,
  onSendPatientText,
  onSendOperatorText,
  onToggleBot,
  onOpenHandoffModal,
  onResetConversation,
}: ChatPanelColumnProps) {
  const [draft, setDraft] = useState('');
  const [composerRole, setComposerRole] = useState<'paciente' | 'agente'>('paciente');
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [simMenuOpen, setSimMenuOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Si el bot se reactiva, volver a modo paciente automáticamente
  useEffect(() => {
    if (conversation.botEnabled && composerRole === 'agente') {
      setComposerRole('paciente');
    }
  }, [conversation.botEnabled, composerRole]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages.length, session.quickActions.length]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setDraft('');
    setAttachMenuOpen(false);
    setSimMenuOpen(false);

    if (composerRole === 'agente' && !conversation.botEnabled) {
      onSendOperatorText(trimmed);
    } else {
      onSendPatientText(trimmed);
    }
  };

  const handleQuickActionClick = (action: ChatQuickAction) => {
    if (sending) return;
    setAttachMenuOpen(false);
    setSimMenuOpen(false);
    onSendPatientText(action.value, { displayLabel: action.label });
  };

  const handleAttachFile = (att: ChatAttachment) => {
    setAttachMenuOpen(false);
    onSendPatientText(att.name, {
      displayLabel: `📎 ${att.name}`,
      attachment: att,
    });
  };

  const displayName =
    session.verified && patient ? `${patient.firstName} ${patient.lastName}` : formatPhoneAR(conversation.phone);

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#EFEAE2]">
      {/* Header del chat */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={session.verified && patient ? `${patient.firstName} ${patient.lastName}` : 'NP'} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
              {session.verified ? (
                <Badge variant="success">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Verificado
                </Badge>
              ) : (
                <Badge variant="warning">
                  <Lock className="mr-1 h-3 w-3" />
                  Sin verificar
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-slate-500">
              {conversation.botEnabled
                ? `Asistente ${BRAND.shortName} activo · ${conversation.department}`
                : `Bot pausado · ${conversation.department}${conversation.assignedTo ? ` · Operador: ${conversation.assignedTo}` : ' · En cola humana'}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={conversation.botEnabled ? 'outline' : 'secondary'}
            leftIcon={conversation.botEnabled ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
            onClick={onToggleBot}
          >
            {conversation.botEnabled ? 'Pausar bot' : 'Retomar bot'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
            onClick={onOpenHandoffModal}
          >
            Operador
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Reiniciar flujo de bienvenida y verificación"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={onResetConversation}
          >
            Reiniciar
          </Button>
        </div>
      </div>

      {/* Aviso institucional discreto */}
      <div className="flex items-center justify-between gap-2 border-b border-primary-100/80 bg-primary-50/90 px-4 py-1.5 text-[11px] text-primary-800">
        <span className="truncate">
          <strong>Simulador WhatsApp · {BRAND.name}</strong> — No diagnostica, no recomienda tratamientos ni prescribe medicamentos.
        </span>
        {!conversation.botEnabled && (
          <Badge variant="info" className="shrink-0">
            Atención humana activa
          </Badge>
        )}
      </div>

      {/* Área de mensajes */}
      <div
        className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto px-4 py-4"
        style={{
          backgroundImage: 'radial-gradient(rgba(15, 76, 92, 0.06) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        <div className="flex justify-center">
          <span className="rounded-lg bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-xs">
            HOY · CHAT SIMULADO
          </span>
        </div>

        {conversation.messages.map((msg) => {
          if (msg.sender === 'sistema') {
            return (
              <div key={msg.id} className="flex justify-center py-0.5">
                <span className="rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-center text-[11px] font-medium text-slate-600 shadow-xs">
                  {msg.text} · {formatTime(msg.sentAt)}
                </span>
              </div>
            );
          }

          const isPatient = msg.sender === 'paciente';
          const isBot = msg.sender === 'bot';
          const att = attachments[msg.id];
          const isEmergencyAlert = isBot && msg.text.includes('PROTOCOLO INSTITUCIONAL DE URGENCIAS');

          return (
            <div key={msg.id} className={`flex ${isPatient ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[84%] rounded-xl px-3.5 py-2.5 shadow-sm ${
                  isPatient
                    ? 'rounded-tr-none bg-[#D9FDD3] text-slate-900'
                    : isEmergencyAlert
                      ? 'rounded-tl-none border border-rose-200 bg-rose-50 text-slate-900'
                      : 'rounded-tl-none bg-white text-slate-800'
                }`}
              >
                {!isPatient && (
                  <p
                    className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold ${
                      isEmergencyAlert
                        ? 'text-rose-700'
                        : isBot
                          ? 'text-accent-700'
                          : 'text-primary-700'
                    }`}
                  >
                    {isEmergencyAlert ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : isBot ? (
                      <Bot className="h-3.5 w-3.5" />
                    ) : (
                      <Headset className="h-3.5 w-3.5" />
                    )}
                    {msg.senderName}
                  </p>
                )}

                {att && (
                  <div className="mb-2 flex items-center gap-2.5 rounded-lg border border-black/10 bg-white/80 px-2.5 py-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                      {att.fileType === 'imagen' ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{att.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {att.categoryLabel} · {att.fileType.toUpperCase()} · {att.sizeKb} KB (simulado)
                      </p>
                    </div>
                  </div>
                )}

                <FormattedMessageText text={msg.text} />

                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                  <span>{formatTime(msg.sentAt)}</span>
                  {isPatient && <CheckCheck className="h-3.5 w-3.5 text-sky-500" aria-hidden />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Botones interactivos del flujo actual */}
        {conversation.botEnabled && session.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {session.quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={sending}
                onClick={() => handleQuickActionClick(action)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium shadow-xs transition active:scale-[0.98] disabled:opacity-50 ${
                  action.variant === 'primary'
                    ? 'border-primary-600 bg-primary-700 text-white hover:bg-primary-800'
                    : action.variant === 'danger'
                      ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'border-primary-200 bg-white text-primary-800 hover:border-primary-400 hover:bg-primary-50'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Barra inferior estilo WhatsApp Web */}
      <div className="relative border-t border-line bg-[#F0F2F5] px-3 py-2.5">
        {/* Menú desplegable de adjuntos simulados */}
        {attachMenuOpen && (
          <div className="mb-2 rounded-xl border border-line bg-white p-2.5 shadow-popover">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Simular envío de archivo (sin subida real)
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {SIMULATED_ATTACHMENTS.map((att) => (
                <button
                  key={att.name}
                  type="button"
                  onClick={() => handleAttachFile(att)}
                  className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-left text-xs transition hover:border-primary-300 hover:bg-primary-50/60"
                >
                  {att.fileType === 'imagen' ? (
                    <ImageIcon className="h-4 w-4 shrink-0 text-accent-600" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-primary-700" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{att.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Menú desplegable de escenarios simulados */}
        {simMenuOpen && (
          <div className="mb-2 rounded-xl border border-line bg-white p-2.5 shadow-popover">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Simular mensaje entrante del paciente
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSimMenuOpen(false);
                  onSendPatientText('Tengo fiebre de 39 grados y me falta el aire');
                }}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                🚨 Urgencia (fiebre 39° y disnea)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimMenuOpen(false);
                  onSendPatientText('¿Me podés diagnosticar si puedo cambiar la dosis de mi medicación?');
                }}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                🛡️ Consulta clínica (bloqueo de seguridad)
              </button>
              {session.verified && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSimMenuOpen(false);
                      onSendPatientText('Quiero solicitar un turno');
                    }}
                    className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-slate-700 hover:bg-primary-50"
                  >
                    📅 Pedir turno
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimMenuOpen(false);
                      onSendPatientText('Necesito renovar una receta');
                    }}
                    className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-slate-700 hover:bg-primary-50"
                  >
                    💊 Pedir receta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimMenuOpen(false);
                      onSendPatientText('Menú');
                    }}
                    className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-slate-700 hover:bg-primary-50"
                  >
                    📋 Ver menú
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Selector de rol cuando el bot está pausado (para simular operador y paciente) */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          {!conversation.botEnabled ? (
            <div className="inline-flex rounded-lg border border-line bg-white p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setComposerRole('paciente')}
                className={`rounded-md px-2.5 py-1 transition ${
                  composerRole === 'paciente' ? 'bg-accent-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Escribir como Paciente
              </button>
              <button
                type="button"
                onClick={() => setComposerRole('agente')}
                className={`rounded-md px-2.5 py-1 transition ${
                  composerRole === 'agente' ? 'bg-primary-700 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Responder como {conversation.assignedTo ?? 'Operador'}
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500">
              Escribí como paciente o elegí una opción rápida del asistente.
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setSimMenuOpen((v) => !v);
              setAttachMenuOpen(false);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-primary-700 ring-1 ring-line transition hover:bg-primary-50"
          >
            <Sparkles className="h-3 w-3" />
            Simular mensaje
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            title="Simular adjunto (PDF / imagen)"
            onClick={() => {
              setAttachMenuOpen((v) => !v);
              setSimMenuOpen(false);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-line transition hover:bg-primary-50 hover:text-primary-700"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <Input
            placeholder={
              composerRole === 'agente' && !conversation.botEnabled
                ? `Responder como ${conversation.assignedTo ?? 'Operador'}…`
                : 'Escribí un mensaje como paciente…'
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="bg-white"
          />

          <Button
            type="submit"
            loading={sending}
            className="shrink-0 rounded-full px-4"
            rightIcon={<Send className="h-4 w-4" />}
          >
            Enviar
          </Button>
        </form>
      </div>
    </section>
  );
}
