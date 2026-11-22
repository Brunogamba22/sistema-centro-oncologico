import type { LucideIcon } from 'lucide-react';

export type Role = 'admin' | 'medico' | 'recepcionista';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Cargo o descripción visible en la interfaz. */
  position: string;
  /** Vínculo con la entidad Doctor cuando el rol es "medico". */
  doctorId?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

export interface NavItem {
  /** Identificador estable, usado para asociar la página en el registro de rutas. */
  id: string;
  label: string;
  /** Ruta relativa a la base del panel ('' = índice). */
  path: string;
  icon: LucideIcon;
  /** Roles autorizados. Si se omite, cualquier rol del panel puede acceder. */
  roles?: Role[];
  description?: string;
  phase?: number;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}
