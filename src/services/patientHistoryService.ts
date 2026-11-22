import { env } from '@/config/env';
import { patientHistory as initialHistory } from '@/data/patientHistory';
import type { ID, PatientHistoryEvent } from '@/types';
import { apiClient, mockResponse } from './apiClient';

export const patientHistoryService = {
  async listByPatient(patientId: ID): Promise<PatientHistoryEvent[]> {
    if (!env.useMocks) return apiClient.get<PatientHistoryEvent[]>(`/patients/${patientId}/history`);
    const filtered = initialHistory
      .filter((e) => e.patientId === patientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return mockResponse(filtered, 180);
  },
};
