import { env } from '@/config/env';
import { medicalRequests as initialRequests } from '@/data/medicalRequests';
import type { ID, MedicalRequest, MedicalRequestStatus } from '@/types';
import { ApiError, apiClient, mockResponse } from './apiClient';

let store: MedicalRequest[] = structuredClone(initialRequests);

export type MedicalRequestPayload = Omit<MedicalRequest, 'id' | 'createdAt' | 'updatedAt' | 'history'>;

export const medicalRequestsService = {
  async list(): Promise<MedicalRequest[]> {
    if (!env.useMocks) return apiClient.get<MedicalRequest[]>('/medical-requests');
    return mockResponse(store, 200);
  },

  async create(payload: MedicalRequestPayload, actorName: string): Promise<MedicalRequest> {
    if (!env.useMocks) return apiClient.post<MedicalRequest>('/medical-requests', payload);
    const now = new Date().toISOString();
    const created: MedicalRequest = {
      ...payload,
      id: `sol-${String(store.length + 1).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          id: `h-${Date.now()}`,
          date: now,
          actor: actorName,
          action: 'Solicitud registrada en panel administrativo',
        },
      ],
    };
    store = [created, ...store];
    return mockResponse(created, 220);
  },

  async updateStatus(
    id: ID,
    status: MedicalRequestStatus,
    actorName: string,
    note?: string,
    doctorId?: ID,
  ): Promise<MedicalRequest> {
    if (!env.useMocks) return apiClient.patch<MedicalRequest>(`/medical-requests/${id}`, { status, note, doctorId });
    const idx = store.findIndex((r) => r.id === id);
    if (idx === -1) throw new ApiError('Solicitud no encontrada', 404);
    const now = new Date().toISOString();
    const current = store[idx];
    const nextHistory = [
      ...(current.history ?? []),
      {
        id: `h-${Date.now()}`,
        date: now,
        actor: actorName,
        action: `Estado actualizado a "${status.replace('_', ' ')}"`,
        note: note?.trim() || undefined,
      },
    ];
    const updated: MedicalRequest = {
      ...current,
      status,
      doctorId: doctorId !== undefined ? doctorId || undefined : current.doctorId,
      resolutionNotes: note?.trim() ? note.trim() : current.resolutionNotes,
      updatedAt: now,
      history: nextHistory,
    };
    store = store.map((r, i) => (i === idx ? updated : r));
    return mockResponse(updated, 200);
  },
};
