import type { ComponentType, LazyExoticComponent } from 'react';
import type { RouteObject } from 'react-router-dom';
import ComingSoonPage from '@/pages/system/ComingSoonPage';
import type { NavSection } from '@/types';
import { RequireRole } from './RequireRole';

/** Registro `navItem.id → página`. Los ítems sin página muestran un marcador de "próxima fase". */
export type PageRegistry = Partial<Record<string, ComponentType | LazyExoticComponent<ComponentType>>>;

/**
 * Genera las rutas hijas de un panel a partir de su configuración de navegación,
 * aplicando la restricción por rol de cada ítem.
 */
export function buildPanelRoutes(sections: NavSection[], pages: PageRegistry = {}): RouteObject[] {
  return sections
    .flatMap((section) => section.items)
    .map((item) => {
      const Page = pages[item.id];
      const element = (
        <RequireRole roles={item.roles} mode="deny">
          {Page ? (
            <Page />
          ) : (
            <ComingSoonPage title={item.label} description={item.description} phase={item.phase} icon={item.icon} />
          )}
        </RequireRole>
      );
      return item.path === '' ? { index: true, element } : { path: item.path, element };
    });
}
