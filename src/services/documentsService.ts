import { env } from '@/config/env';
import { documents as initialDocuments } from '@/data/documents';
import type { ClinicalDocument, DocumentCategory, ID } from '@/types';
import { apiClient, mockResponse } from './apiClient';

let store: ClinicalDocument[] = structuredClone(initialDocuments);

export interface DocumentUploadPayload {
  patientId: ID;
  name: string;
  category: DocumentCategory;
  fileType: 'pdf' | 'imagen';
  sizeKb: number;
  uploadedBy: string;
}

export const documentsService = {
  async listByPatient(patientId: ID): Promise<ClinicalDocument[]> {
    if (!env.useMocks) return apiClient.get<ClinicalDocument[]>('/documents', { patientId });
    const filtered = store
      .filter((d) => d.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return mockResponse(filtered, 180);
  },

  async uploadSimulated(payload: DocumentUploadPayload): Promise<ClinicalDocument> {
    if (!env.useMocks) return apiClient.post<ClinicalDocument>('/documents', payload);
    const now = new Date().toISOString();
    const created: ClinicalDocument = {
      ...payload,
      id: `docu-${String(store.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`,
      createdAt: now,
      updatedAt: now,
    };
    store = [created, ...store];
    return mockResponse(created, 250);
  },
};
