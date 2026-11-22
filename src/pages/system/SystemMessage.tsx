import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '@/components/brand/Logo';

interface SystemMessageProps {
  code: string;
  title: string;
  description: string;
  children?: ReactNode;
}

/** Pantalla completa para errores y rutas inexistentes. */
export function SystemMessage({ code, title, description, children }: SystemMessageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
      <LogoMark size={48} />
      <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-accent-600">{code}</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-md text-sm text-slate-500">{description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {children ?? (
          <Link
            to="/"
            className="inline-flex h-10 items-center rounded-lg bg-primary-700 px-4 text-sm font-medium text-white transition hover:bg-primary-800"
          >
            Ir al inicio
          </Link>
        )}
      </div>
    </div>
  );
}
