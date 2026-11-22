import {
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  ListTodo,
  MessageCircle,
  Pill,
  ScrollText,
  Settings,
  Shapes,
  Stethoscope,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react';
import type { NavSection, Role } from '@/types';

const ADMIN_AND_RECEPTION: Role[] = ['admin', 'recepcionista'];
const ADMIN_ONLY: Role[] = ['admin'];

/**
 * Navegación del Panel Administrativo.
 * `path` es relativo a `/admin`. `roles` restringe la visibilidad y el acceso a la ruta.
 * `phase` indica en qué fase del plan se implementa la pantalla.
 */
export const adminNavigation: NavSection[] = [
  {
    title: 'General',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '',
        icon: LayoutDashboard,
        roles: ADMIN_AND_RECEPTION,
        phase: 2,
        description: 'Indicadores clave del centro, ocupación de agendas y actividad reciente.',
      },
    ],
  },
  {
    title: 'Atención',
    items: [
      {
        id: 'turnos',
        label: 'Gestión de turnos',
        path: 'turnos',
        icon: CalendarClock,
        roles: ADMIN_AND_RECEPTION,
        phase: 2,
        description: 'Alta, edición, cancelación y reprogramación de turnos con filtros avanzados.',
      },
      {
        id: 'agenda',
        label: 'Agenda médica',
        path: 'agenda',
        icon: CalendarDays,
        roles: ADMIN_AND_RECEPTION,
        phase: 2,
        description: 'Vista diaria y semanal de la agenda de cada profesional.',
      },
      {
        id: 'pacientes',
        label: 'Pacientes',
        path: 'pacientes',
        icon: Users,
        roles: ADMIN_AND_RECEPTION,
        phase: 2,
        description: 'Padrón de pacientes con cobertura, número de afiliado y ficha completa.',
      },
      {
        id: 'medicos',
        label: 'Médicos',
        path: 'medicos',
        icon: Stethoscope,
        roles: ADMIN_AND_RECEPTION,
        phase: 2,
        description: 'Profesionales, matrículas, especialidades y disponibilidad horaria.',
      },
      {
        id: 'especialidades',
        label: 'Especialidades',
        path: 'especialidades',
        icon: Shapes,
        roles: ADMIN_ONLY,
        phase: 2,
        description: 'Catálogo de especialidades oncológicas del centro.',
      },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      {
        id: 'solicitudes',
        label: 'Solicitudes médicas',
        path: 'solicitudes',
        icon: ClipboardList,
        roles: ADMIN_AND_RECEPTION,
        phase: 3,
        description: 'Recetas, órdenes de estudio y documentación solicitada por los pacientes.',
      },
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        path: 'whatsapp',
        icon: MessageCircle,
        roles: ADMIN_AND_RECEPTION,
        phase: 3,
        description: 'Bandeja de conversaciones del asistente virtual y derivaciones a atención humana.',
      },
      {
        id: 'notificaciones',
        label: 'Notificaciones',
        path: 'notificaciones',
        icon: Bell,
        roles: ADMIN_AND_RECEPTION,
        phase: 3,
        description: 'Historial de notificaciones enviadas y plantillas de mensajes.',
      },
    ],
  },
  {
    title: 'Gestión',
    items: [
      {
        id: 'usuarios',
        label: 'Usuarios y permisos',
        path: 'usuarios',
        icon: UserCog,
        roles: ADMIN_ONLY,
        phase: 3,
        description: 'Usuarios del sistema, roles y matriz de permisos.',
      },
      {
        id: 'reportes',
        label: 'Reportes',
        path: 'reportes',
        icon: BarChart3,
        roles: ADMIN_ONLY,
        phase: 3,
        description: 'Reportes estadísticos de atención, ausentismo y productividad.',
      },
      {
        id: 'auditoria',
        label: 'Auditoría',
        path: 'auditoria',
        icon: ScrollText,
        roles: ADMIN_ONLY,
        phase: 3,
        description: 'Registro de acciones realizadas por los usuarios del sistema.',
      },
      {
        id: 'configuracion',
        label: 'Configuración',
        path: 'configuracion',
        icon: Settings,
        roles: ADMIN_ONLY,
        phase: 3,
        description: 'Datos institucionales, horarios de atención e integraciones.',
      },
    ],
  },
];

/**
 * Navegación del Panel Médico. `path` es relativo a `/medico`.
 * El perfil del paciente (`pacientes/:patientId`) no figura en el menú: se accede desde "Mis pacientes".
 */
export const doctorNavigation: NavSection[] = [
  {
    title: 'Mi espacio',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '',
        icon: LayoutDashboard,
        phase: 4,
        description: 'Resumen del día: turnos, pacientes atendidos, pendientes y actividad reciente.',
      },
      {
        id: 'agenda',
        label: 'Mi agenda',
        path: 'agenda',
        icon: CalendarDays,
        phase: 4,
        description: 'Calendario diario, semanal y mensual con turnos, estados y datos de pacientes.',
      },
    ],
  },
  {
    title: 'Pacientes',
    items: [
      {
        id: 'pacientes',
        label: 'Mis pacientes',
        path: 'pacientes',
        icon: Users,
        phase: 4,
        description: 'Padrón autorizado de pacientes, búsqueda por DNI o nombre y acceso a fichas.',
      },
      {
        id: 'historial',
        label: 'Historial de atenciones',
        path: 'historial',
        icon: History,
        phase: 4,
        description: 'Registro cronológico de consultas anteriores y profesionales intervinientes.',
      },
    ],
  },
  {
    title: 'Gestión médica',
    items: [
      {
        id: 'recetas',
        label: 'Solicitudes de recetas',
        path: 'recetas',
        icon: Pill,
        phase: 4,
        description: 'Revisión profesional de medicación declarada, documentación y antecedentes.',
      },
      {
        id: 'pendientes',
        label: 'Solicitudes pendientes',
        path: 'pendientes',
        icon: ListTodo,
        phase: 4,
        description: 'Bandeja de tareas y solicitudes asignadas al profesional.',
      },
      {
        id: 'documentacion',
        label: 'Documentación recibida',
        path: 'documentacion',
        icon: FileText,
        phase: 4,
        description: 'Estudios, informes, recetas y comprobantes administrativos de sus pacientes.',
      },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      {
        id: 'notificaciones',
        label: 'Notificaciones',
        path: 'notificaciones',
        icon: Bell,
        phase: 4,
        description: 'Avisos de turnos, solicitudes y documentación recibida.',
      },
      {
        id: 'perfil',
        label: 'Mi perfil',
        path: 'perfil',
        icon: UserRound,
        phase: 4,
        description: 'Datos profesionales, matrícula, especialidades y horarios de atención.',
      },
    ],
  },
];
