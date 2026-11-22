import { Suspense } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { PageLoader } from '@/components/ui/Spinner';
import { ROLE_CONFIG } from '@/config/roles';
import { useAuth } from '@/context/auth/useAuth';

/** Layout independiente para la demostración del chatbot (sin sidebar). */
export function ChatbotLayout() {
  const { user, logout } = useAuth();
  const homePath = user ? ROLE_CONFIG[user.role].homePath : '/acceso';

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <DemoBanner />
      <header className="flex h-topbar shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                to={homePath}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-800 transition hover:bg-primary-100"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Ir a {ROLE_CONFIG[user.role].panel === 'admin' ? 'Panel Admin' : 'Panel Médico'}</span>
                <span className="sm:hidden">Panel</span>
              </Link>
              <Link
                to="/acceso"
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Cambiar rol</span>
              </Link>
            </>
          ) : (
            <Link
              to="/acceso"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver al acceso</span>
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1 px-3 py-4 sm:px-5 lg:px-6">
        <div className="mx-auto w-full max-w-[1440px]">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
