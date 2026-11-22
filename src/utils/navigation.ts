import type { NavItem, NavSection, Role } from '@/types';

/** Ruta absoluta de un ítem de navegación dentro de su panel. */
export function resolveNavPath(basePath: string, path: string): string {
  return path ? `${basePath}/${path}` : basePath;
}

/** Filtra secciones e ítems según el rol del usuario y descarta secciones vacías. */
export function filterNavigationByRole(sections: NavSection[], role: Role | undefined): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || (role !== undefined && item.roles.includes(role))),
    }))
    .filter((section) => section.items.length > 0);
}

/** Ítem de navegación que corresponde a la ruta actual (coincidencia más específica). */
export function findActiveNavItem(sections: NavSection[], basePath: string, pathname: string): NavItem | undefined {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return sections
    .flatMap((section) => section.items)
    .filter((item) => {
      const full = resolveNavPath(basePath, item.path);
      if (item.path === '') return normalized === basePath;
      return normalized === full || normalized.startsWith(`${full}/`);
    })
    .sort((a, b) => b.path.length - a.path.length)[0];
}
