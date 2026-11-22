import { env } from '@/config/env';
import { patientHistory as initialHistory } from '@/data/patientHistory';
import type { ID, PatientHistoryEvent } from '@/types';
import { apiClient, mockResponse } from './apiClient';

let store: PatientHistoryEvent[] = structuredClone(initialHistory);

export type PatientHistoryPayload = Omit<PatientHistoryEvent, 'id'>;

export const patientHistoryService = {
  async listAll(): Promise<PatientHistoryEvent[]> {
    if (!env.useMocks) return apiClient.get<PatientHistoryEvent[]>('/patients/history');
    const sorted = [...store].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return mockResponse(sorted, 180);
  },

  async listByPatient(patientId: ID): Promise<PatientHistoryEvent[]> {
    if (!env.useMocks) return apiClient.get<PatientHistoryEvent[]>(`/patients/${patientId}/history`);
    const filtered = store
      .filter((e) => e.patientId === patientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return mockResponse(filtered, 180);
  },

  async addEntry(payload: PatientHistoryPayload): Promise<PatientHistoryEvent> {
    if (!env.useMocks) return apiClient.post<PatientHistoryEvent>(`/patients/${payload.patientId}/history`, payload);
    const created: PatientHistoryEvent = {
      ...payload,
      id: `his-${String(store.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`,
    };
    store = [created, ...store];
    return mockResponse(created, 200);
  },
};
