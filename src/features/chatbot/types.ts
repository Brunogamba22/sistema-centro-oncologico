import type {
  Appointment,
  AppointmentType,
  ClinicSite,
  Coverage,
  Doctor,
  DoctorUnavailability,
  DocumentCategory,
  ID,
  Patient,
  Specialty,
  WhatsAppConversation,
  WhatsAppConversationStatus,
  WhatsAppMessage,
} from '@/types';

export interface ChatQuickAction {
  id: string;
  label: string;
  value: string;
  variant?: 'default' | 'primary' | 'danger';
}

export interface ChatAttachment {
  name: string;
  fileType: 'pdf' | 'imagen';
  sizeKb: number;
  categoryLabel: string;
}

export type ChatbotFlow =
  | 'bienvenida'
  | 'menu'
  | 'turnos'
  | 'gestion_turnos'
  | 'recetas'
  | 'documentacion'
  | 'atencion_humana';

export type ChatbotStep =
  | 'ask_dni'
  | 'verify_identity'
  | 'idle'
  | 'select_specialty'
  | 'select_doctor'
  | 'select_date'
  | 'select_time'
  | 'select_type'
  | 'confirm_booking'
  | 'select_appointment'
  | 'select_action'
  | 'confirm_cancel'
  | 'reschedule_date'
  | 'reschedule_time'
  | 'confirm_reschedule'
  | 'rx_coverage'
  | 'rx_affiliate'
  | 'rx_medication'
  | 'rx_dose'
  | 'rx_frequency'
  | 'rx_reason'
  | 'rx_previous'
  | 'confirm_rx'
  | 'doc_category'
  | 'doc_file'
  | 'doc_notes'
  | 'confirm_doc'
  | 'select_department'
  | 'handed_off';

export interface BookingDraft {
  specialtyId?: ID;
  doctorId?: ID;
  dateKey?: string;
  time?: string;
  type?: AppointmentType;
}

export interface ManageAppointmentDraft {
  appointmentId?: ID;
  newDateKey?: string;
  newTime?: string;
}

export interface PrescriptionDraft {
  coverageName?: string;
  affiliateNumber?: string;
  declaredMedication?: string;
  dose?: string;
  frequency?: string;
  reason?: string;
  previousPrescriptionFile?: ChatAttachment;
  previousPrescriptionNote?: string;
}

export interface DocumentDraft {
  docTypeLabel?: 'Derivación' | 'Estudio' | 'Receta' | 'Informe';
  category?: DocumentCategory;
  file?: ChatAttachment;
  notes?: string;
}

export interface ConversationSession {
  verified: boolean;
  verifiedPatientId?: ID;
  pendingPatientId?: ID;
  verificationAttempts: number;
  flow: ChatbotFlow;
  step: ChatbotStep;
  quickActions: ChatQuickAction[];
  booking: BookingDraft;
  manage: ManageAppointmentDraft;
  prescription: PrescriptionDraft;
  document: DocumentDraft;
}

export interface BotEngineContext {
  conversation: WhatsAppConversation;
  patients: Patient[];
  doctors: Doctor[];
  specialties: Specialty[];
  coverages: Coverage[];
  appointments: Appointment[];
  blocks: DoctorUnavailability[];
  sites: ClinicSite[];
}

export interface BotTurnOutcome {
  messages: WhatsAppMessage[];
  nextSession: ConversationSession;
  conversationPatch?: Partial<{
    patientId: ID;
    phone: string;
    status: WhatsAppConversationStatus;
    botEnabled: boolean;
    department: WhatsAppConversation['department'];
    assignedTo: string | undefined;
    tags: string[];
    unreadCount: number;
  }>;
  attachments?: Record<string, ChatAttachment>;
  mutatedDomain?: boolean;
  toast?: {
    title: string;
    description: string;
    variant: 'success' | 'info' | 'warning';
  };
}
