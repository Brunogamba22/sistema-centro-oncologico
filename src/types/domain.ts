/**
 * Entidades de dominio. Funcionan como contrato (DTO) con la futura API REST / MySQL:
 * identificadores string, fechas en ISO 8601 y enums en snake_case.
 */
export type ID = string;
export type ISODateString = string;
/** Hora en formato HH:mm (24 h). */
export type TimeString = string;

export interface Timestamps {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* ---------- Coberturas ---------- */

export type CoverageType = 'obra_social' | 'prepaga' | 'particular';

export interface Coverage {
  id: ID;
  name: string;
  type: CoverageType;
  plans: string[];
}

export interface PatientCoverage {
  coverageId: ID;
  plan?: string;
  affiliateNumber: string;
}

/* ---------- Pacientes ---------- */

export type Gender = 'F' | 'M' | 'X';
export type PatientStatus = 'activo' | 'en_tratamiento' | 'seguimiento' | 'alta' | 'inactivo';

export interface Address {
  street: string;
  city: string;
  province: string;
  postalCode?: string;
}

export interface Patient extends Timestamps {
  id: ID;
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: ISODateString;
  gender: Gender;
  phone: string;
  email?: string;
  address?: Address;
  coverage: PatientCoverage;
  status: PatientStatus;
  assignedDoctorId?: ID;
}

/* ---------- Profesionales ---------- */

export interface Specialty {
  id: ID;
  name: string;
  description: string;
  /** Color de referencia (hex) para agendas y gráficos. */
  color: string;
  /** Duración estándar de la consulta en minutos. */
  defaultDurationMinutes?: number;
  active: boolean;
}

export interface WeeklySchedule {
  /** 0 = domingo … 6 = sábado */
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: TimeString;
  endTime: TimeString;
  slotMinutes: number;
}

export interface Doctor extends Timestamps {
  id: ID;
  title: 'Dr.' | 'Dra.' | 'Lic.';
  firstName: string;
  lastName: string;
  licenseNumber: string;
  specialtyIds: ID[];
  email: string;
  phone: string;
  /** Sede principal de atención. */
  siteId?: ID;
  active: boolean;
  schedule: WeeklySchedule[];
}

/* ---------- Turnos ---------- */

export type AppointmentStatus =
  | 'pendiente'
  | 'confirmado'
  | 'en_espera'
  | 'en_atencion'
  | 'atendido'
  | 'cancelado'
  | 'ausente'
  | 'reprogramado';

export type AppointmentType = 'primera_vez' | 'control' | 'tratamiento' | 'estudio';
export type Channel = 'whatsapp' | 'telefono' | 'presencial' | 'web';

export interface Appointment extends Timestamps {
  id: ID;
  patientId: ID;
  doctorId: ID;
  specialtyId: ID;
  startAt: ISODateString;
  endAt: ISODateString;
  status: AppointmentStatus;
  type: AppointmentType;
  channel: Channel;
  notes?: string;
}

/* ---------- Solicitudes médicas ---------- */

export type MedicalRequestType = 'receta' | 'orden_estudio' | 'certificado' | 'informe' | 'autorizacion';
export type MedicalRequestStatus = 'pendiente' | 'en_revision' | 'info_solicitada' | 'aprobada' | 'rechazada' | 'entregada';
export type Priority = 'baja' | 'media' | 'alta';

export interface PrescriptionRequestDetails {
  /** Medicación declarada por el paciente (no constituye prescripción automática). */
  declaredMedication: string;
  dose: string;
  frequency: string;
  route?: string;
  reason: string;
  lastIssuedDate?: string;
}

export interface MedicalRequestHistoryEntry {
  id: ID;
  date: ISODateString;
  actor: string;
  action: string;
  note?: string;
}

export interface MedicalRequest extends Timestamps {
  id: ID;
  type: MedicalRequestType;
  status: MedicalRequestStatus;
  priority: Priority;
  patientId: ID;
  doctorId?: ID;
  channel: Channel;
  description: string;
  medicationDetails?: PrescriptionRequestDetails;
  resolutionNotes?: string;
  history?: MedicalRequestHistoryEntry[];
}

/* ---------- Medicación declarada y notificaciones del profesional ---------- */

export interface DeclaredMedication {
  id: ID;
  patientId: ID;
  name: string;
  dose: string;
  frequency: string;
  route: string;
  declaredAt: ISODateString;
  active: boolean;
  notes?: string;
}

export type DoctorNotificationCategory = 'turno' | 'receta' | 'solicitud' | 'documento' | 'sistema';

export interface DoctorNotification extends AppNotification {
  doctorId: ID;
  category: DoctorNotificationCategory;
  patientId?: ID;
}

export interface DocumentPreviewSection {
  heading: string;
  lines: string[];
}

export interface DocumentPreviewContent {
  documentId: ID;
  domain: 'clinico' | 'administrativo';
  issuer: string;
  documentCode: string;
  summary: string;
  sections: DocumentPreviewSection[];
}

/* ---------- Documentación ---------- */

export type DocumentCategory = 'estudio' | 'informe' | 'receta' | 'consentimiento' | 'otro';

export interface ClinicalDocument extends Timestamps {
  id: ID;
  patientId: ID;
  name: string;
  category: DocumentCategory;
  fileType: 'pdf' | 'imagen';
  sizeKb: number;
  uploadedBy: string;
}

/* ---------- Notificaciones y auditoría ---------- */

export type NotificationType = 'info' | 'success' | 'warning' | 'alert';

export interface AppNotification {
  id: ID;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: ISODateString;
  link?: string;
}

export type AuditAction =
  | 'crear'
  | 'editar'
  | 'eliminar'
  | 'login'
  | 'logout'
  | 'exportar'
  | 'aprobar'
  | 'rechazar';

export interface AuditLog {
  id: ID;
  userId: ID;
  userName: string;
  userRole?: 'admin' | 'medico' | 'recepcionista';
  action: AuditAction;
  module?: string;
  entity: string;
  entityId?: ID;
  description: string;
  ip: string;
  createdAt: ISODateString;
}

/* ---------- Agenda médica: bloqueos y ausencias ---------- */

export type UnavailabilityType = 'bloqueo' | 'vacaciones' | 'ausencia';

export interface DoctorUnavailability extends Timestamps {
  id: ID;
  doctorId: ID;
  type: UnavailabilityType;
  /** Fecha YYYY-MM-DD (inicio) */
  startDate: string;
  /** Fecha YYYY-MM-DD (fin, inclusive) */
  endDate: string;
  allDay: boolean;
  startTime?: TimeString;
  endTime?: TimeString;
  reason: string;
}

/* ---------- Historial del paciente ---------- */

export type PatientHistoryCategory = 'consulta' | 'tratamiento' | 'estudio' | 'administrativo';

export interface PatientHistoryEvent {
  id: ID;
  patientId: ID;
  date: ISODateString;
  category: PatientHistoryCategory;
  title: string;
  description: string;
  doctorId?: ID;
}

/* ---------- WhatsApp (Bandeja operativa) ---------- */

export type WhatsAppConversationStatus = 'bot' | 'espera_humano' | 'en_atencion' | 'resuelta';
export type WhatsAppMessageSender = 'paciente' | 'bot' | 'agente' | 'sistema';

export interface WhatsAppMessage {
  id: ID;
  sender: WhatsAppMessageSender;
  senderName: string;
  text: string;
  sentAt: ISODateString;
}

export interface WhatsAppConversation {
  id: ID;
  patientId: ID;
  phone: string;
  status: WhatsAppConversationStatus;
  botEnabled: boolean;
  assignedTo?: string;
  department: 'Recepción' | 'Turnos' | 'Documentación' | 'Asistente virtual';
  unreadCount: number;
  tags: string[];
  lastMessageAt: ISODateString;
  messages: WhatsAppMessage[];
}

/* ---------- Notificaciones operativas ---------- */

export type NotificationCategory = 'recordatorio' | 'confirmacion' | 'cancelacion' | 'reprogramacion';
export type NotificationDeliveryStatus = 'enviada' | 'entregada' | 'leida' | 'fallida' | 'programada';
export type NotificationChannel = 'whatsapp' | 'email' | 'sms';

export interface NotificationLog {
  id: ID;
  category: NotificationCategory;
  channel: NotificationChannel;
  patientId: ID;
  recipient: string;
  subject: string;
  message: string;
  status: NotificationDeliveryStatus;
  sentAt: ISODateString;
  appointmentId?: ID;
}

export interface NotificationRule {
  id: ID;
  category: NotificationCategory;
  name: string;
  description: string;
  enabled: boolean;
  channels: NotificationChannel[];
  timingLabel: string;
  template: string;
}

/* ---------- Usuarios del sistema ---------- */

export interface SystemUser extends Timestamps {
  id: ID;
  name: string;
  email: string;
  role: 'admin' | 'medico' | 'recepcionista';
  position: string;
  active: boolean;
  lastLoginAt?: ISODateString;
  doctorId?: ID;
  siteId?: ID;
}

/* ---------- Configuración institucional, sedes y consultorios ---------- */

export interface ClinicSite {
  id: ID;
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  hours: string;
  isMain: boolean;
  active: boolean;
}

export interface ConsultingRoom {
  id: ID;
  siteId: ID;
  name: string;
  floor: string;
  specialtyFocus: string;
  active: boolean;
}

export interface InstitutionSettings {
  name: string;
  shortName: string;
  cuit: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  timezone: string;
  defaultSlotMinutes: number;
  maxAdvanceBookingDays: number;
  reminderHoursBefore: number;
  autoConfirmWhatsapp: boolean;
  requireDniValidation: boolean;
  enableChatbotHandoff: boolean;
}
