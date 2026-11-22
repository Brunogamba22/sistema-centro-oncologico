import { Suspense } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { PageLoader } from '@/components/ui/Spinner';

/** Layout independiente para la demostración del chatbot (sin sidebar). */
export function ChatbotLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <DemoBanner />
      <header className="flex h-topbar shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4 sm:px-6 lg:px-8">
        <Logo />
        <Link
          to="/acceso"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Volver al acceso</span>
        </Link>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
