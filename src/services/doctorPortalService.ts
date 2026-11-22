import { DOCUMENT_DOMAIN_META } from '@/config/status';
import {
  declaredMedications as initialMedications,
  documentPreviews,
  initialDoctorNotifications,
} from '@/data/doctorClinicalData';
import type {
  ClinicalDocument,
  DeclaredMedication,
  DoctorNotification,
  DocumentPreviewContent,
  ID,
  Patient,
} from '@/types';
import { mockResponse } from './apiClient';

let notificationsStore: DoctorNotification[] = structuredClone(initialDoctorNotifications);
const medicationsStore: DeclaredMedication[] = structuredClone(initialMedications);
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((fn) => fn());
};

/**
 * Servicio de dominio del Panel Médico.
 * Aplica aislamiento por profesional (`doctorId`) sobre pacientes, notificaciones y vistas clínicas.
 */
export const doctorPortalService = {
  /** Verifica si un paciente pertenece al padrón autorizado del médico. */
  isPatientAuthorized(patient: Patient | undefined, doctorId: ID | undefined): boolean {
    if (!patient || !doctorId) return false;
    return patient.assignedDoctorId === doctorId;
  },

  /** Filtra el listado completo de pacientes dejando únicamente los autorizados para el profesional. */
  filterAuthorizedPatients(allPatients: Patient[], doctorId: ID | undefined): Patient[] {
    if (!doctorId) return [];
    return allPatients.filter((p) => p.assignedDoctorId === doctorId);
  },

  async listDeclaredMedications(patientId: ID): Promise<DeclaredMedication[]> {
    const items = medicationsStore
      .filter((m) => m.patientId === patientId)
      .sort((a, b) => new Date(b.declaredAt).getTime() - new Date(a.declaredAt).getTime());
    return mockResponse(items, 150);
  },

  getDocumentPreview(doc: ClinicalDocument): DocumentPreviewContent {
    const existing = documentPreviews[doc.id];
    if (existing) return existing;
    const domainMeta = DOCUMENT_DOMAIN_META[doc.category];
    return {
      documentId: doc.id,
      domain: domainMeta.domain,
      issuer: doc.uploadedBy,
      documentCode: `DEMO-${doc.id.toUpperCase()}`,
      summary: `Vista previa simulada de "${doc.name}" (${domainMeta.label.toLowerCase()}).`,
      sections: [
        {
          heading: 'Contenido de demostración',
          lines: [
            'Archivo ficticio disponible para revisión visual dentro del prototipo.',
            'No contiene datos reales de pacientes ni constituye un diagnóstico automatizado.',
          ],
        },
      ],
    };
  },

  async listNotifications(doctorId: ID): Promise<DoctorNotification[]> {
    const filtered = notificationsStore
      .filter((n) => n.doctorId === doctorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return mockResponse(filtered, 150);
  },

  getUnreadCountSync(doctorId: ID | undefined): number {
    if (!doctorId) return 0;
    return notificationsStore.filter((n) => n.doctorId === doctorId && !n.read).length;
  },

  async markNotificationRead(id: ID): Promise<DoctorNotification | undefined> {
    notificationsStore = notificationsStore.map((n) => (n.id === id ? { ...n, read: true } : n));
    notifyListeners();
    return mockResponse(notificationsStore.find((n) => n.id === id), 120);
  },

  async markAllNotificationsRead(doctorId: ID): Promise<void> {
    notificationsStore = notificationsStore.map((n) => (n.doctorId === doctorId ? { ...n, read: true } : n));
    notifyListeners();
    await mockResponse(true, 150);
  },

  pushNotification(
    input: Omit<DoctorNotification, 'id' | 'read' | 'createdAt'>,
  ): DoctorNotification {
    const created: DoctorNotification = {
      ...input,
      id: `dnot-${String(notificationsStore.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    notificationsStore = [created, ...notificationsStore];
    notifyListeners();
    return created;
  },

  subscribeNotifications(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
