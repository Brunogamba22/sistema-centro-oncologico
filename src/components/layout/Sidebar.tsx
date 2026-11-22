import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { ROLE_CONFIG } from '@/config/roles';
import { useAuth } from '@/context/auth/useAuth';
import type { NavSection } from '@/types';
import { cn } from '@/utils/cn';
import { filterNavigationByRole, resolveNavPath } from '@/utils/navigation';

interface SidebarProps {
  navigation: NavSection[];
  basePath: string;
  panelLabel: string;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ navigation, basePath, panelLabel, open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sections = filterNavigationByRole(navigation, user?.role);

  const handleLogout = () => {
    logout();
    navigate('/acceso', { replace: true });
  };

  return (
    <>
      {/* Overlay móvil */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        id="app-sidebar"
        aria-label="Navegación principal"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-sidebar flex-col bg-primary-900 text-primary-100 transition-transform duration-200 ease-out',
          'lg:translate-x-0',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        )}
      >
        <div className="flex h-topbar shrink-0 items-center justify-between gap-2 px-4">
          <Logo variant="light" size={34} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-primary-200 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pb-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-accent-300">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden />
            {panelLabel}
          </span>
        </div>

        <nav className="scrollbar-thin-dark flex-1 overflow-y-auto px-3 py-2">
          {sections.map((section, index) => (
            <div key={section.title ?? index} className="mb-4">
              {section.title && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-primary-300/70">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <NavLink
                      to={resolveNavPath(basePath, item.path)}
                      end={item.path === ''}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-primary-100/80 hover:bg-white/5 hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-accent-400" aria-hidden />
                          )}
                          <item.icon
                            className={cn(
                              'h-[18px] w-[18px] shrink-0',
                              isActive ? 'text-accent-300' : 'text-primary-300 group-hover:text-primary-100',
                            )}
                            aria-hidden
                          />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {user && (
          <div className="shrink-0 border-t border-white/10 p-3">
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <Avatar name={user.name} size="sm" className="bg-accent-500/20 text-accent-200" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                <p className="truncate text-xs text-primary-300">{ROLE_CONFIG[user.role].label}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-primary-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
