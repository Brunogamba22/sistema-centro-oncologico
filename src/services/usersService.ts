import { env } from '@/config/env';
import { initialSystemUsers } from '@/data/systemUsers';
import type { ID, SystemUser } from '@/types';
import { ApiError, apiClient, mockResponse } from './apiClient';

let store: SystemUser[] = structuredClone(initialSystemUsers);

export type SystemUserPayload = Omit<SystemUser, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>;

export const usersService = {
  async list(): Promise<SystemUser[]> {
    if (!env.useMocks) return apiClient.get<SystemUser[]>('/users');
    return mockResponse(store, 180);
  },

  async create(payload: SystemUserPayload): Promise<SystemUser> {
    if (!env.useMocks) return apiClient.post<SystemUser>('/users', payload);
    const now = new Date().toISOString();
    const created: SystemUser = {
      ...payload,
      id: `usr-${String(store.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-2)}`,
      createdAt: now,
      updatedAt: now,
    };
    store = [created, ...store];
    return mockResponse(created, 220);
  },

  async update(id: ID, payload: Partial<SystemUserPayload>): Promise<SystemUser> {
    if (!env.useMocks) return apiClient.patch<SystemUser>(`/users/${id}`, payload);
    const idx = store.findIndex((u) => u.id === id);
    if (idx === -1) throw new ApiError('Usuario no encontrado', 404);
    const updated: SystemUser = {
      ...store[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    store = store.map((u, i) => (i === idx ? updated : u));
    return mockResponse(updated, 200);
  },

  async toggleActive(id: ID): Promise<SystemUser> {
    const found = store.find((u) => u.id === id);
    if (!found) throw new ApiError('Usuario no encontrado', 404);
    return this.update(id, { active: !found.active });
  },
};
