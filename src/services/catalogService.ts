import { env } from '@/config/env';
import { coverages } from '@/data/coverages';
import { specialties as initialSpecialties } from '@/data/specialties';
import type { Coverage, ID, Specialty } from '@/types';
import { ApiError, apiClient, mockResponse } from './apiClient';

let specialtiesStore: Specialty[] = structuredClone(initialSpecialties);

export type SpecialtyPayload = Omit<Specialty, 'id'>;

/** Catálogos de referencia (tablas maestras). */
export const catalogService = {
  async listSpecialties(): Promise<Specialty[]> {
    if (!env.useMocks) return apiClient.get<Specialty[]>('/specialties');
    return mockResponse(specialtiesStore, 160);
  },

  async createSpecialty(payload: SpecialtyPayload): Promise<Specialty> {
    if (!env.useMocks) return apiClient.post<Specialty>('/specialties', payload);
    const created: Specialty = {
      ...payload,
      id: `esp-${String(specialtiesStore.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`,
    };
    specialtiesStore = [...specialtiesStore, created];
    return mockResponse(created, 220);
  },

  async updateSpecialty(id: ID, payload: Partial<SpecialtyPayload>): Promise<Specialty> {
    if (!env.useMocks) return apiClient.patch<Specialty>(`/specialties/${id}`, payload);
    const idx = specialtiesStore.findIndex((s) => s.id === id);
    if (idx === -1) throw new ApiError('Especialidad no encontrada', 404);
    const updated: Specialty = { ...specialtiesStore[idx], ...payload };
    specialtiesStore = specialtiesStore.map((s, i) => (i === idx ? updated : s));
    return mockResponse(updated, 220);
  },

  async toggleSpecialtyActive(id: ID): Promise<Specialty> {
    const found = specialtiesStore.find((s) => s.id === id);
    if (!found) throw new ApiError('Especialidad no encontrada', 404);
    return this.updateSpecialty(id, { active: !found.active });
  },

  async listCoverages(): Promise<Coverage[]> {
    if (!env.useMocks) return apiClient.get<Coverage[]>('/coverages');
    return mockResponse(coverages, 150);
  },
};
