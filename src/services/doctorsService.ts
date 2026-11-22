import { env } from '@/config/env';
import { doctors } from '@/data/doctors';
import type { Doctor, ID } from '@/types';
import { ApiError, apiClient, mockResponse } from './apiClient';

export const doctorsService = {
  async list(): Promise<Doctor[]> {
    if (!env.useMocks) return apiClient.get<Doctor[]>('/doctors');
    return mockResponse(doctors);
  },

  async getById(id: ID): Promise<Doctor> {
    if (!env.useMocks) return apiClient.get<Doctor>(`/doctors/${id}`);
    const doctor = doctors.find((d) => d.id === id);
    if (!doctor) throw new ApiError('Profesional no encontrado', 404);
    return mockResponse(doctor);
  },
};
