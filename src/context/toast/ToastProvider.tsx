import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ToastContext, type ToastInput, type ToastItem, type ToastVariant } from './ToastContext';

const VARIANT_STYLES: Record<ToastVariant, { icon: LucideIcon; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-emerald-600' },
  info: { icon: Info, className: 'text-primary-600' },
  warning: { icon: AlertTriangle, className: 'text-amber-500' },
  danger: { icon: XCircle, className: 'text-rose-600' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'info', duration = 4000 }: ToastInput) => {
      const id = ++counter.current;
      setToasts((current) => [...current.slice(-3), { id, title, description, variant, duration }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:w-96"
      >
        {toasts.map(({ id, title, description, variant }) => {
          const { icon: Icon, className } = VARIANT_STYLES[variant];
          return (
            <div
              key={id}
              role="status"
              className="pointer-events-auto flex w-full animate-slide-up items-start gap-3 rounded-xl border border-line bg-white p-4 shadow-popover"
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', className)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(id)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
