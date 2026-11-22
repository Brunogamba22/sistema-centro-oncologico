import { env } from '@/config/env';
import { patients as initialPatients } from '@/data/patients';
import type { ID, Patient } from '@/types';
import { ApiError, apiClient, mockResponse } from './apiClient';

let store: Patient[] = structuredClone(initialPatients);

export type PatientPayload = Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>;

export const patientsService = {
  async list(): Promise<Patient[]> {
    if (!env.useMocks) return apiClient.get<Patient[]>('/patients');
    return mockResponse(store, 200);
  },

  async getById(id: ID): Promise<Patient> {
    if (!env.useMocks) return apiClient.get<Patient>(`/patients/${id}`);
    const found = store.find((p) => p.id === id);
    if (!found) throw new ApiError('Paciente no encontrado', 404);
    return mockResponse(found, 180);
  },

  async create(payload: PatientPayload): Promise<Patient> {
    if (!env.useMocks) return apiClient.post<Patient>('/patients', payload);
    const now = new Date().toISOString();
    const created: Patient = {
      ...payload,
      id: `pat-${String(store.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`,
      createdAt: now,
      updatedAt: now,
    };
    store = [created, ...store];
    return mockResponse(created, 250);
  },

  async update(id: ID, payload: Partial<PatientPayload>): Promise<Patient> {
    if (!env.useMocks) return apiClient.patch<Patient>(`/patients/${id}`, payload);
    const idx = store.findIndex((p) => p.id === id);
    if (idx === -1) throw new ApiError('Paciente no encontrado', 404);
    const updated: Patient = {
      ...store[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    store = store.map((p, i) => (i === idx ? updated : p));
    return mockResponse(updated, 250);
  },
};
