import { env } from '@/config/env';
import { whatsappConversations as initialConversations } from '@/data/whatsappConversations';
import type { ID, WhatsAppConversation } from '@/types';
import { ApiError, apiClient, mockResponse } from './apiClient';

let store: WhatsAppConversation[] = structuredClone(initialConversations);

const SIMULATED_PATIENT_REPLIES = [
  'Perfecto, muchas gracias por la confirmación. ¿Necesito llevar orden impresa?',
  'Genial, entonces nos vemos el día del turno. ¡Saludos!',
  '¿Podrían confirmar en qué piso atiende el profesional en esa sede?',
  'Gracias, ya envié la foto de la credencial actualizada.',
];

const BOT_AUTO_REPLIES = [
  'Gracias por escribirnos. Recordá concurrir con DNI, credencial vigente y estudios previos si corresponde. ¿Necesitás hablar con recepción?',
  '¡Anotado! Si necesitás reprogramar o solicitar una receta, podés indicarlo aquí y derivamos tu mensaje al área correspondiente.',
];

export const whatsappService = {
  async list(): Promise<WhatsAppConversation[]> {
    if (!env.useMocks) return apiClient.get<WhatsAppConversation[]>('/whatsapp/conversations');
    const sorted = [...store].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
    return mockResponse(sorted, 160);
  },

  async markRead(id: ID): Promise<WhatsAppConversation> {
    const idx = store.findIndex((c) => c.id === id);
    if (idx === -1) throw new ApiError('Conversación no encontrada', 404);
    const updated = { ...store[idx], unreadCount: 0 };
    store = store.map((c, i) => (i === idx ? updated : c));
    return mockResponse(updated, 60);
  },

  async sendMessage(id: ID, text: string, senderName: string): Promise<WhatsAppConversation> {
    const idx = store.findIndex((c) => c.id === id);
    if (idx === -1) throw new ApiError('Conversación no encontrada', 404);
    const now = new Date().toISOString();
    const conv = store[idx];
    const updated: WhatsAppConversation = {
      ...conv,
      status: conv.status === 'resuelta' ? 'en_atencion' : conv.status === 'bot' || conv.status === 'espera_humano' ? 'en_atencion' : conv.status,
      botEnabled: false,
      assignedTo: conv.assignedTo ?? senderName,
      unreadCount: 0,
      lastMessageAt: now,
      messages: [
        ...conv.messages,
        {
          id: `m-${Date.now()}`,
          sender: 'agente',
          senderName,
          text: text.trim(),
          sentAt: now,
        },
      ],
    };
    store = store.map((c, i) => (i === idx ? updated : c));
    return mockResponse(updated, 150);
  },

  async assignTo(id: ID, agentName: string): Promise<WhatsAppConversation> {
    const idx = store.findIndex((c) => c.id === id);
    if (idx === -1) throw new ApiError('Conversación no encontrada', 404);
    const now = new Date().toISOString();
    const conv = store[idx];
    const updated: WhatsAppConversation = {
      ...conv,
      assignedTo: agentName,
      status: 'en_atencion',
      botEnabled: false,
      unreadCount: 0,
      lastMessageAt: now,
      messages: [
        ...conv.messages,
        {
          id: `m-${Date.now()}`,
          sender: 'sistema',
          senderName: 'Sistema',
          text: `Conversación asignada a ${agentName}. Atención automática pausada.`,
          sentAt: now,
        },
      ],
    };
    store = store.map((c, i) => (i === idx ? updated : c));
    return mockResponse(updated, 150);
  },

  async transferTo(
    id: ID,
    department: WhatsAppConversation['department'],
    agentName?: string,
  ): Promise<WhatsAppConversation> {
    const idx = store.findIndex((c) => c.id === id);
    if (idx === -1) throw new ApiError('Conversación no encontrada', 404);
    const now = new Date().toISOString();
    const conv = store[idx];
    const isBotDept = department === 'Asistente virtual';
    const updated: WhatsAppConversation = {
      ...conv,
      department,
      assignedTo: isBotDept ? undefined : agentName || undefined,
      botEnabled: isBotDept,
      status: isBotDept ? 'bot' : agentName ? 'en_atencion' : 'espera_humano',
      lastMessageAt: now,
      messages: [
        ...conv.messages,
        {
          id: `m-${Date.now()}`,
          sender: 'sistema',
          senderName: 'Sistema',
          text: isBotDept
            ? 'Conversación transferida nuevamente al Asistente virtual.'
            : `Conversación transferida a ${department}${agentName ? ` (${agentName})` : ''}.`,
          sentAt: now,
        },
      ],
    };
    store = store.map((c, i) => (i === idx ? updated : c));
    return mockResponse(updated, 160);
  },

  async toggleBot(id: ID): Promise<WhatsAppConversation> {
    const idx = store.findIndex((c) => c.id === id);
    if (idx === -1) throw new ApiError('Conversación no encontrada', 404);
    const now = new Date().toISOString();
    const conv = store[idx];
    const nextBot = !conv.botEnabled;
    const updated: WhatsAppConversation = {
      ...conv,
      botEnabled: nextBot,
      status: nextBot ? 'bot' : conv.assignedTo ? 'en_atencion' : 'espera_humano',
      lastMessageAt: now,
      messages: [
        ...conv.messages,
        {
          id: `m-${Date.now()}`,
          sender: 'sistema',
          senderName: 'Sistema',
          text: nextBot
            ? 'Atención automática (Bot) reactivada para esta conversación.'
            : 'Atención automática (Bot) pausada por un operador.',
          sentAt: now,
        },
      ],
    };
    store = store.map((c, i) => (i === idx ? updated : c));
    return mockResponse(updated, 150);
  },

  async resolve(id: ID, actorName: string): Promise<WhatsAppConversation> {
    const idx = store.findIndex((c) => c.id === id);
    if (idx === -1) throw new ApiError('Conversación no encontrada', 404);
    const now = new Date().toISOString();
    const conv = store[idx];
    const updated: WhatsAppConversation = {
      ...conv,
      status: 'resuelta',
      botEnabled: true,
      unreadCount: 0,
      lastMessageAt: now,
      messages: [
        ...conv.messages,
        {
          id: `m-${Date.now()}`,
          sender: 'sistema',
          senderName: 'Sistema',
          text: `Conversación marcada como resuelta por ${actorName}.`,
          sentAt: now,
        },
      ],
    };
    store = store.map((c, i) => (i === idx ? updated : c));
    return mockResponse(updated, 150);
  },

  async simulateIncomingReply(id: ID, patientName: string): Promise<WhatsAppConversation> {
    const idx = store.findIndex((c) => c.id === id);
    if (idx === -1) throw new ApiError('Conversación no encontrada', 404);
    const conv = store[idx];
    const now = new Date();
    const replyText = SIMULATED_PATIENT_REPLIES[conv.messages.length % SIMULATED_PATIENT_REPLIES.length];
    const newMessages = [
      ...conv.messages,
      {
        id: `m-${Date.now()}`,
        sender: 'paciente' as const,
        senderName: patientName,
        text: replyText,
        sentAt: now.toISOString(),
      },
    ];

    let lastAt = now.toISOString();
    if (conv.botEnabled) {
      const botTime = new Date(now.getTime() + 1500).toISOString();
      lastAt = botTime;
      newMessages.push({
        id: `m-${Date.now() + 1}`,
        sender: 'bot',
        senderName: 'Asistente COI',
        text: BOT_AUTO_REPLIES[conv.messages.length % BOT_AUTO_REPLIES.length],
        sentAt: botTime,
      });
    }

    const updated: WhatsAppConversation = {
      ...conv,
      status: conv.status === 'resuelta' ? (conv.botEnabled ? 'bot' : 'espera_humano') : conv.status,
      lastMessageAt: lastAt,
      messages: newMessages,
    };
    store = store.map((c, i) => (i === idx ? updated : c));
    return mockResponse(updated, 250);
  },
};
