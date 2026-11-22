import { env } from '@/config/env';
import { doctorBlocks as initialBlocks } from '@/data/doctorBlocks';
import type { DoctorUnavailability, ID } from '@/types';
import { ApiError, apiClient, mockResponse } from './apiClient';

let store: DoctorUnavailability[] = structuredClone(initialBlocks);

export type BlockPayload = Omit<DoctorUnavailability, 'id' | 'createdAt' | 'updatedAt'>;

export const agendaService = {
  async listBlocks(): Promise<DoctorUnavailability[]> {
    if (!env.useMocks) return apiClient.get<DoctorUnavailability[]>('/agenda/blocks');
    return mockResponse(store, 180);
  },

  async createBlock(payload: BlockPayload): Promise<DoctorUnavailability> {
    if (!env.useMocks) return apiClient.post<DoctorUnavailability>('/agenda/blocks', payload);
    const now = new Date().toISOString();
    const created: DoctorUnavailability = {
      ...payload,
      id: `blk-${String(store.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`,
      createdAt: now,
      updatedAt: now,
    };
    store = [created, ...store];
    return mockResponse(created, 220);
  },

  async deleteBlock(id: ID): Promise<void> {
    if (!env.useMocks) return apiClient.delete(`/agenda/blocks/${id}`);
    const exists = store.some((b) => b.id === id);
    if (!exists) throw new ApiError('Bloqueo no encontrado', 404);
    store = store.filter((b) => b.id !== id);
    await mockResponse(true, 180);
  },
};
