import { env } from '@/config/env';
import { coverages } from '@/data/coverages';
import { specialties } from '@/data/specialties';
import type { Coverage, Specialty } from '@/types';
import { apiClient, mockResponse } from './apiClient';

/** Catálogos de referencia (tablas maestras). */
export const catalogService = {
  async listSpecialties(): Promise<Specialty[]> {
    if (!env.useMocks) return apiClient.get<Specialty[]>('/specialties');
    return mockResponse(specialties);
  },

  async listCoverages(): Promise<Coverage[]> {
    if (!env.useMocks) return apiClient.get<Coverage[]>('/coverages');
    return mockResponse(coverages);
  },
};
