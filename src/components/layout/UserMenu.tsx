import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Repeat } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ROLE_CONFIG } from '@/config/roles';
import { useAuth } from '@/context/auth/useAuth';
import { useClickOutside } from '@/hooks/useClickOutside';
import { cn } from '@/utils/cn';

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useClickOutside(containerRef, close, open);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/acceso', { replace: true });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-slate-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.name} size="sm" />
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-[160px] truncate text-sm font-medium text-slate-900">{user.name}</span>
          <span className="block text-xs text-slate-500">{ROLE_CONFIG[user.role].label}</span>
        </span>
        <ChevronDown className={cn('hidden h-4 w-4 text-slate-400 transition md:block', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 animate-scale-in overflow-hidden rounded-xl border border-line bg-white shadow-popover"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="primary">{ROLE_CONFIG[user.role].label}</Badge>
              <Badge variant="accent">Sesión demo</Badge>
            </div>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Repeat className="h-4 w-4 text-slate-400" /> Cambiar de rol
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
