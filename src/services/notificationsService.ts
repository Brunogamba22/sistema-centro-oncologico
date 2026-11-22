import { env } from '@/config/env';
import { initialNotificationLogs, initialNotificationRules } from '@/data/notifications';
import type { ID, NotificationLog, NotificationRule } from '@/types';
import { ApiError, apiClient, mockResponse } from './apiClient';

let logsStore: NotificationLog[] = structuredClone(initialNotificationLogs);
let rulesStore: NotificationRule[] = structuredClone(initialNotificationRules);

export const notificationsService = {
  async listLogs(): Promise<NotificationLog[]> {
    if (!env.useMocks) return apiClient.get<NotificationLog[]>('/notifications/logs');
    return mockResponse(logsStore, 180);
  },

  async listRules(): Promise<NotificationRule[]> {
    if (!env.useMocks) return apiClient.get<NotificationRule[]>('/notifications/rules');
    return mockResponse(rulesStore, 160);
  },

  async updateRule(id: ID, patch: Partial<Omit<NotificationRule, 'id'>>): Promise<NotificationRule> {
    if (!env.useMocks) return apiClient.patch<NotificationRule>(`/notifications/rules/${id}`, patch);
    const idx = rulesStore.findIndex((r) => r.id === id);
    if (idx === -1) throw new ApiError('Regla no encontrada', 404);
    const updated: NotificationRule = { ...rulesStore[idx], ...patch };
    rulesStore = rulesStore.map((r, i) => (i === idx ? updated : r));
    return mockResponse(updated, 180);
  },

  async sendManual(payload: Omit<NotificationLog, 'id' | 'sentAt' | 'status'>): Promise<NotificationLog> {
    if (!env.useMocks) return apiClient.post<NotificationLog>('/notifications/send', payload);
    const created: NotificationLog = {
      ...payload,
      id: `not-${String(logsStore.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-2)}`,
      status: 'enviada',
      sentAt: new Date().toISOString(),
    };
    logsStore = [created, ...logsStore];
    return mockResponse(created, 220);
  },
};
