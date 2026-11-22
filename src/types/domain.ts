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
export type MedicalRequestStatus = 'pendiente' | 'en_revision' | 'aprobada' | 'rechazada' | 'entregada';
export type Priority = 'baja' | 'media' | 'alta';

export interface MedicalRequest extends Timestamps {
  id: ID;
  type: MedicalRequestType;
  status: MedicalRequestStatus;
  priority: Priority;
  patientId: ID;
  doctorId?: ID;
  channel: Channel;
  description: string;
  resolutionNotes?: string;
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
  action: AuditAction;
  entity: string;
  entityId?: ID;
  description: string;
  ip: string;
  createdAt: ISODateString;
}
