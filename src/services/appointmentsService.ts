import { env } from '@/config/env';
import { appointments as initialAppointments } from '@/data/appointments';
import type { Appointment, AppointmentStatus, ID } from '@/types';
import { ApiError, apiClient, mockResponse } from './apiClient';

let store: Appointment[] = structuredClone(initialAppointments);

export type AppointmentPayload = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>;

export const appointmentsService = {
  async list(): Promise<Appointment[]> {
    if (!env.useMocks) return apiClient.get<Appointment[]>('/appointments');
    return mockResponse(store, 200);
  },

  async listByPatient(patientId: ID): Promise<Appointment[]> {
    if (!env.useMocks) return apiClient.get<Appointment[]>('/appointments', { patientId });
    const filtered = store
      .filter((a) => a.patientId === patientId)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
    return mockResponse(filtered, 180);
  },

  async create(payload: AppointmentPayload): Promise<Appointment> {
    if (!env.useMocks) return apiClient.post<Appointment>('/appointments', payload);
    const now = new Date().toISOString();
    const created: Appointment = {
      ...payload,
      id: `apt-${String(store.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`,
      createdAt: now,
      updatedAt: now,
    };
    store = [created, ...store];
    return mockResponse(created, 250);
  },

  async reschedule(id: ID, startAt: string, endAt: string, notes?: string): Promise<Appointment> {
    if (!env.useMocks) {
      return apiClient.patch<Appointment>(`/appointments/${id}/reschedule`, { startAt, endAt, notes });
    }
    const idx = store.findIndex((a) => a.id === id);
    if (idx === -1) throw new ApiError('Turno no encontrado', 404);
    const updated: Appointment = {
      ...store[idx],
      startAt,
      endAt,
      status: 'reprogramado',
      notes: notes !== undefined ? notes : store[idx].notes,
      updatedAt: new Date().toISOString(),
    };
    store = store.map((a, i) => (i === idx ? updated : a));
    return mockResponse(updated, 220);
  },

  async updateStatus(id: ID, status: AppointmentStatus, notes?: string): Promise<Appointment> {
    if (!env.useMocks) {
      return apiClient.patch<Appointment>(`/appointments/${id}/status`, { status, notes });
    }
    const idx = store.findIndex((a) => a.id === id);
    if (idx === -1) throw new ApiError('Turno no encontrado', 404);
    const updated: Appointment = {
      ...store[idx],
      status,
      notes: notes !== undefined ? notes : store[idx].notes,
      updatedAt: new Date().toISOString(),
    };
    store = store.map((a, i) => (i === idx ? updated : a));
    return mockResponse(updated, 200);
  },
};
