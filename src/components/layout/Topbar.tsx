import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Menu, Search } from 'lucide-react';
import { useToast } from '@/context/toast/useToast';
import { UserMenu } from './UserMenu';

interface TopbarProps {
  panelLabel: string;
  pageTitle?: string;
  notificationsPath: string;
  unreadNotifications?: number;
  onMenuClick: () => void;
}

export function Topbar({ panelLabel, pageTitle, notificationsPath, unreadNotifications = 0, onMenuClick }: TopbarProps) {
  const { toast } = useToast();

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast({
      title: 'Búsqueda global',
      description: 'La búsqueda se habilitará junto con los módulos de pacientes y turnos.',
      variant: 'info',
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-topbar shrink-0 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="-ml-1 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
        aria-label="Abrir menú"
        aria-controls="app-sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0">
        <p className="hidden text-xs text-slate-500 sm:block">{panelLabel}</p>
        <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{pageTitle ?? panelLabel}</h1>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <form onSubmit={handleSearch} role="search" className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar pacientes, turnos…"
            aria-label="Búsqueda global"
            className="h-9 w-56 rounded-lg border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 lg:w-72"
          />
        </form>

        <Link
          to={notificationsPath}
          className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={`Notificaciones${unreadNotifications ? ` (${unreadNotifications} sin leer)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
              {unreadNotifications}
            </span>
          )}
        </Link>

        <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
        <UserMenu />
      </div>
    </header>
  );
}
