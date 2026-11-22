import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { PageLoader } from '@/components/ui/Spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { NavSection } from '@/types';
import { findActiveNavItem } from '@/utils/navigation';

export interface PanelLayoutProps {
  navigation: NavSection[];
  basePath: string;
  panelLabel: string;
  unreadNotifications?: number;
}

/**
 * Estructura común de los paneles (sidebar 248px + topbar + contenido).
 * Cada panel (Admin / Médico) define su propia navegación y experiencia.
 */
export function PanelLayout({ navigation, basePath, panelLabel, unreadNotifications }: PanelLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const activeItem = findActiveNavItem(navigation, basePath, pathname);

  useDocumentTitle(activeItem?.label ?? panelLabel);
  useLockBodyScroll(sidebarOpen);

  // Cierra el drawer móvil al navegar.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        navigation={navigation}
        basePath={basePath}
        panelLabel={panelLabel}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-col lg:pl-sidebar">
        <DemoBanner />
        <Topbar
          panelLabel={panelLabel}
          pageTitle={activeItem?.label}
          notificationsPath={`${basePath}/notificaciones`}
          unreadNotifications={unreadNotifications}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px] animate-fade-in">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
