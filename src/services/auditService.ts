import { env } from '@/config/env';
import { initialAuditLogs } from '@/data/auditLogs';
import type { AuditLog } from '@/types';
import { apiClient, mockResponse } from './apiClient';

let store: AuditLog[] = structuredClone(initialAuditLogs);

export const auditService = {
  async list(): Promise<AuditLog[]> {
    if (!env.useMocks) return apiClient.get<AuditLog[]>('/audit-logs');
    return mockResponse(store, 180);
  },

  async record(entry: Omit<AuditLog, 'id' | 'createdAt' | 'ip'>): Promise<AuditLog> {
    const created: AuditLog = {
      ...entry,
      id: `aud-${String(store.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-2)}`,
      ip: '190.210.42.18',
      createdAt: new Date().toISOString(),
    };
    store = [created, ...store];
    return mockResponse(created, 60);
  },
};
