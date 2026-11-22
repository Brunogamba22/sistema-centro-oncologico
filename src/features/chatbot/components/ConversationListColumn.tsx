import { Bot, Lock, MessageSquarePlus, PauseCircle, Search, ShieldCheck } from 'lucide-react';
import { Avatar, Badge, Button, Input } from '@/components/ui';
import { WHATSAPP_STATUS_META } from '@/config/status';
import type { Patient, WhatsAppConversation, WhatsAppConversationStatus } from '@/types';
import { formatPhoneAR, formatTime } from '@/utils/format';
import type { ConversationSession } from '../types';

interface ConversationListColumnProps {
  conversations: WhatsAppConversation[];
  selectedId: string;
  search: string;
  statusFilter: string;
  patientMap: Map<string, Patient>;
  sessions: Record<string, ConversationSession>;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelect: (conv: WhatsAppConversation) => void;
  onNewConversation: () => void;
}

const FILTER_TABS: { id: string; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'bot', label: 'Bot' },
  { id: 'espera_humano', label: 'Espera' },
  { id: 'en_atencion', label: 'Humano' },
  { id: 'resuelta', label: 'Resueltas' },
];

function stripMarkdown(text: string): string {
  return text.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
}

export function ConversationListColumn({
  conversations,
  selectedId,
  search,
  statusFilter,
  patientMap,
  sessions,
  onSearchChange,
  onStatusFilterChange,
  onSelect,
  onNewConversation,
}: ConversationListColumnProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-line bg-white">
      {/* Header estilo WhatsApp Web con identidad COI */}
      <div className="flex items-center justify-between gap-2 bg-primary-800 px-3.5 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Conversaciones</p>
          <p className="text-[11px] text-primary-200">{conversations.length} chats activos (demo)</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0 bg-accent-500 text-white hover:bg-accent-600"
          leftIcon={<MessageSquarePlus className="h-3.5 w-3.5" />}
          onClick={onNewConversation}
        >
          Nuevo chat
        </Button>
      </div>

      {/* Buscador y filtros */}
      <div className="space-y-2.5 border-b border-line bg-surface/60 p-3">
        <Input
          placeholder="Buscar paciente, DNI o teléfono…"
          leftIcon={<Search />}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusFilterChange(tab.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                statusFilter === tab.id
                  ? 'bg-primary-700 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-line hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de conversaciones */}
      <div className="scrollbar-thin flex-1 divide-y divide-line overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-500">No hay conversaciones con ese filtro.</p>
        ) : (
          conversations.map((conv) => {
            const session = sessions[conv.id];
            const isVerified = session?.verified ?? false;
            const patient = isVerified && conv.patientId ? patientMap.get(conv.patientId) : undefined;
            const lastMsg = conv.messages[conv.messages.length - 1];
            const statusMeta = WHATSAPP_STATUS_META[conv.status as WhatsAppConversationStatus];
            const isSelected = conv.id === selectedId;
            const displayName = patient
              ? `${patient.lastName}, ${patient.firstName}`
              : formatPhoneAR(conv.phone);

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelect(conv)}
                className={`w-full px-3.5 py-3 text-left transition ${
                  isSelected
                    ? 'border-l-[3px] border-l-accent-600 bg-primary-50/75'
                    : 'border-l-[3px] border-l-transparent hover:bg-surface/80'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="relative shrink-0">
                    <Avatar name={patient ? `${patient.firstName} ${patient.lastName}` : 'NP'} size="sm" />
                    <span
                      title={isVerified ? 'Identidad verificada' : 'Pendiente de verificación'}
                      className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white ${
                        isVerified ? 'bg-accent-500 text-white' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {isVerified ? <ShieldCheck className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                      <span className="shrink-0 text-[10px] text-slate-400">{formatTime(conv.lastMessageAt)}</span>
                    </div>

                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                      {lastMsg ? stripMarkdown(lastMsg.text) : 'Sin mensajes'}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                        {conv.botEnabled ? (
                          <Bot className="h-3.5 w-3.5 text-accent-600" aria-label="Bot activo" />
                        ) : (
                          <PauseCircle className="h-3.5 w-3.5 text-amber-600" aria-label="Bot pausado" />
                        )}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1.5 text-[10px] font-bold text-white">
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
    </aside>
  );
}
