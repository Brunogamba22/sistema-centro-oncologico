import { env } from '@/config/env';
import { doctors as initialDoctors } from '@/data/doctors';
import type { Doctor, ID } from '@/types';
import { ApiError, apiClient, mockResponse } from './apiClient';

let store: Doctor[] = structuredClone(initialDoctors);

export type DoctorPayload = Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>;

export const doctorsService = {
  async list(): Promise<Doctor[]> {
    if (!env.useMocks) return apiClient.get<Doctor[]>('/doctors');
    return mockResponse(store, 180);
  },

  async getById(id: ID): Promise<Doctor> {
    if (!env.useMocks) return apiClient.get<Doctor>(`/doctors/${id}`);
    const doctor = store.find((d) => d.id === id);
    if (!doctor) throw new ApiError('Profesional no encontrado', 404);
    return mockResponse(doctor, 150);
  },

  async create(payload: DoctorPayload): Promise<Doctor> {
    if (!env.useMocks) return apiClient.post<Doctor>('/doctors', payload);
    const now = new Date().toISOString();
    const created: Doctor = {
      ...payload,
      id: `doc-${String(store.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`,
      createdAt: now,
      updatedAt: now,
    };
    store = [created, ...store];
    return mockResponse(created, 220);
  },

  async update(id: ID, payload: Partial<DoctorPayload>): Promise<Doctor> {
    if (!env.useMocks) return apiClient.patch<Doctor>(`/doctors/${id}`, payload);
    const idx = store.findIndex((d) => d.id === id);
    if (idx === -1) throw new ApiError('Profesional no encontrado', 404);
    const updated: Doctor = {
      ...store[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    store = store.map((d, i) => (i === idx ? updated : d));
    return mockResponse(updated, 220);
  },

  async toggleActive(id: ID): Promise<Doctor> {
    const found = store.find((d) => d.id === id);
    if (!found) throw new ApiError('Profesional no encontrado', 404);
    return this.update(id, { active: !found.active });
  },
};
