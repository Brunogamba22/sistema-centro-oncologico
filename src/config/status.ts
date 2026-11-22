import type { BadgeVariant } from '@/components/ui/Badge';
import type {
  AppointmentStatus,
  AppointmentType,
  AuditAction,
  Channel,
  CoverageType,
  DocumentCategory,
  MedicalRequestStatus,
  MedicalRequestType,
  NotificationCategory,
  NotificationChannel,
  NotificationDeliveryStatus,
  PatientHistoryCategory,
  PatientStatus,
  Priority,
  UnavailabilityType,
  WhatsAppConversationStatus,
} from '@/types';

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, { label: string; variant: BadgeVariant }> = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  confirmado: { label: 'Confirmado', variant: 'success' },
  en_espera: { label: 'En espera', variant: 'info' },
  en_atencion: { label: 'En atención', variant: 'accent' },
  atendido: { label: 'Atendido', variant: 'primary' },
  cancelado: { label: 'Cancelado', variant: 'danger' },
  ausente: { label: 'Ausente', variant: 'neutral' },
  reprogramado: { label: 'Reprogramado', variant: 'info' },
};

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  primera_vez: 'Primera vez',
  control: 'Control',
  tratamiento: 'Tratamiento',
  estudio: 'Estudio',
};

export const CHANNEL_META: Record<Channel, { label: string; variant: BadgeVariant }> = {
  whatsapp: { label: 'WhatsApp', variant: 'accent' },
  telefono: { label: 'Teléfono', variant: 'primary' },
  presencial: { label: 'Presencial', variant: 'neutral' },
  web: { label: 'Web', variant: 'info' },
};

export const PATIENT_STATUS_META: Record<PatientStatus, { label: string; variant: BadgeVariant }> = {
  activo: { label: 'Activo', variant: 'success' },
  en_tratamiento: { label: 'En tratamiento', variant: 'accent' },
  seguimiento: { label: 'Seguimiento', variant: 'info' },
  alta: { label: 'Alta', variant: 'primary' },
  inactivo: { label: 'Inactivo', variant: 'neutral' },
};

export const COVERAGE_TYPE_LABELS: Record<CoverageType, string> = {
  obra_social: 'Obra social',
  prepaga: 'Prepaga',
  particular: 'Particular',
};

export const DOCUMENT_CATEGORY_META: Record<DocumentCategory, { label: string; variant: BadgeVariant }> = {
  estudio: { label: 'Estudio', variant: 'info' },
  informe: { label: 'Informe', variant: 'primary' },
  receta: { label: 'Receta', variant: 'accent' },
  consentimiento: { label: 'Consentimiento', variant: 'warning' },
  otro: { label: 'Otro', variant: 'neutral' },
};

export const DOCUMENT_DOMAIN_META: Record<DocumentCategory, { domain: 'clinico' | 'administrativo'; label: string }> = {
  estudio: { domain: 'clinico', label: 'Clínico' },
  informe: { domain: 'clinico', label: 'Clínico' },
  receta: { domain: 'clinico', label: 'Clínico' },
  consentimiento: { domain: 'administrativo', label: 'Administrativo' },
  otro: { domain: 'administrativo', label: 'Administrativo' },
};

export const UNAVAILABILITY_META: Record<UnavailabilityType, { label: string; variant: BadgeVariant }> = {
  bloqueo: { label: 'Bloqueo horario', variant: 'warning' },
  vacaciones: { label: 'Vacaciones', variant: 'info' },
  ausencia: { label: 'Ausencia', variant: 'danger' },
};

export const HISTORY_CATEGORY_META: Record<PatientHistoryCategory, { label: string; variant: BadgeVariant }> = {
  consulta: { label: 'Consulta', variant: 'primary' },
  tratamiento: { label: 'Tratamiento', variant: 'accent' },
  estudio: { label: 'Estudio', variant: 'info' },
  administrativo: { label: 'Administrativo', variant: 'neutral' },
};

export const DAY_OF_WEEK_LABELS: Record<0 | 1 | 2 | 3 | 4 | 5 | 6, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export const DAY_OF_WEEK_SHORT: Record<0 | 1 | 2 | 3 | 4 | 5 | 6, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

export const MEDICAL_REQUEST_TYPE_META: Record<MedicalRequestType, { label: string; variant: BadgeVariant }> = {
  receta: { label: 'Receta médica', variant: 'accent' },
  orden_estudio: { label: 'Orden de estudio', variant: 'info' },
  certificado: { label: 'Certificado', variant: 'primary' },
  informe: { label: 'Informe clínico', variant: 'neutral' },
  autorizacion: { label: 'Autorización', variant: 'warning' },
};

export const MEDICAL_REQUEST_STATUS_META: Record<MedicalRequestStatus, { label: string; variant: BadgeVariant }> = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  en_revision: { label: 'En revisión', variant: 'info' },
  info_solicitada: { label: 'Info solicitada', variant: 'warning' },
  aprobada: { label: 'Aprobada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'danger' },
  entregada: { label: 'Entregada', variant: 'primary' },
};

export const PRIORITY_META: Record<Priority, { label: string; variant: BadgeVariant }> = {
  baja: { label: 'Baja', variant: 'neutral' },
  media: { label: 'Media', variant: 'info' },
  alta: { label: 'Alta', variant: 'danger' },
};

export const WHATSAPP_STATUS_META: Record<WhatsAppConversationStatus, { label: string; variant: BadgeVariant }> = {
  bot: { label: 'Atención automática', variant: 'accent' },
  espera_humano: { label: 'En espera', variant: 'warning' },
  en_atencion: { label: 'En atención', variant: 'info' },
  resuelta: { label: 'Resuelta', variant: 'success' },
};

export const NOTIFICATION_CATEGORY_META: Record<NotificationCategory, { label: string; variant: BadgeVariant }> = {
  recordatorio: { label: 'Recordatorio', variant: 'info' },
  confirmacion: { label: 'Confirmación', variant: 'success' },
  cancelacion: { label: 'Cancelación', variant: 'danger' },
  reprogramacion: { label: 'Reprogramación', variant: 'warning' },
};

export const NOTIFICATION_DELIVERY_META: Record<NotificationDeliveryStatus, { label: string; variant: BadgeVariant }> = {
  enviada: { label: 'Enviada', variant: 'info' },
  entregada: { label: 'Entregada', variant: 'primary' },
  leida: { label: 'Leída', variant: 'success' },
  fallida: { label: 'Fallida', variant: 'danger' },
  programada: { label: 'Programada', variant: 'warning' },
};

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Correo electrónico',
  sms: 'SMS',
};

export const AUDIT_ACTION_META: Record<AuditAction, { label: string; variant: BadgeVariant }> = {
  crear: { label: 'Alta', variant: 'success' },
  editar: { label: 'Edición', variant: 'info' },
  eliminar: { label: 'Eliminación', variant: 'danger' },
  login: { label: 'Inicio de sesión', variant: 'primary' },
  logout: { label: 'Cierre de sesión', variant: 'neutral' },
  exportar: { label: 'Exportación', variant: 'accent' },
  aprobar: { label: 'Aprobación', variant: 'success' },
  rechazar: { label: 'Rechazo', variant: 'warning' },
};
