import { env } from '@/config/env';
import { initialRooms, initialSettings, initialSites } from '@/data/settings';
import type { ClinicSite, ConsultingRoom, ID, InstitutionSettings } from '@/types';
import { ApiError, apiClient, mockResponse } from './apiClient';

let settingsStore: InstitutionSettings = structuredClone(initialSettings);
let sitesStore: ClinicSite[] = structuredClone(initialSites);
let roomsStore: ConsultingRoom[] = structuredClone(initialRooms);

export const settingsService = {
  async getSettings(): Promise<InstitutionSettings> {
    if (!env.useMocks) return apiClient.get<InstitutionSettings>('/settings');
    return mockResponse(settingsStore, 150);
  },

  async updateSettings(payload: InstitutionSettings): Promise<InstitutionSettings> {
    if (!env.useMocks) return apiClient.put<InstitutionSettings>('/settings', payload);
    settingsStore = { ...payload };
    return mockResponse(settingsStore, 200);
  },

  async listSites(): Promise<ClinicSite[]> {
    if (!env.useMocks) return apiClient.get<ClinicSite[]>('/sites');
    return mockResponse(sitesStore, 150);
  },

  async saveSite(payload: Omit<ClinicSite, 'id'>, id?: ID): Promise<ClinicSite> {
    if (id) {
      const idx = sitesStore.findIndex((s) => s.id === id);
      if (idx === -1) throw new ApiError('Sede no encontrada', 404);
      const updated: ClinicSite = { ...payload, id };
      sitesStore = sitesStore.map((s, i) => (i === idx ? updated : payload.isMain ? { ...s, isMain: false } : s));
      return mockResponse(updated, 180);
    }
    const created: ClinicSite = {
      ...payload,
      id: `site-${String(sitesStore.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-2)}`,
    };
    sitesStore = payload.isMain
      ? [created, ...sitesStore.map((s) => ({ ...s, isMain: false }))]
      : [...sitesStore, created];
    return mockResponse(created, 200);
  },

  async toggleSite(id: ID): Promise<ClinicSite> {
    const idx = sitesStore.findIndex((s) => s.id === id);
    if (idx === -1) throw new ApiError('Sede no encontrada', 404);
    const updated = { ...sitesStore[idx], active: !sitesStore[idx].active };
    sitesStore = sitesStore.map((s, i) => (i === idx ? updated : s));
    return mockResponse(updated, 160);
  },

  async listRooms(): Promise<ConsultingRoom[]> {
    if (!env.useMocks) return apiClient.get<ConsultingRoom[]>('/rooms');
    return mockResponse(roomsStore, 150);
  },

  async saveRoom(payload: Omit<ConsultingRoom, 'id'>, id?: ID): Promise<ConsultingRoom> {
    if (id) {
      const idx = roomsStore.findIndex((r) => r.id === id);
      if (idx === -1) throw new ApiError('Consultorio no encontrado', 404);
      const updated: ConsultingRoom = { ...payload, id };
      roomsStore = roomsStore.map((r, i) => (i === idx ? updated : r));
      return mockResponse(updated, 180);
    }
    const created: ConsultingRoom = {
      ...payload,
      id: `room-${String(roomsStore.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-2)}`,
    };
    roomsStore = [...roomsStore, created];
    return mockResponse(created, 200);
  },

  async toggleRoom(id: ID): Promise<ConsultingRoom> {
    const idx = roomsStore.findIndex((r) => r.id === id);
    if (idx === -1) throw new ApiError('Consultorio no encontrado', 404);
    const updated = { ...roomsStore[idx], active: !roomsStore[idx].active };
    roomsStore = roomsStore.map((r, i) => (i === idx ? updated : r));
    return mockResponse(updated, 160);
  },
};
