import { ShieldAlert } from 'lucide-react';
import { DEMO_NOTICE } from '@/config/constants';

/** Aviso permanente de entorno de demostración con datos ficticios. */
export function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-accent-100 bg-accent-50 px-4 py-1.5 text-center text-xs text-accent-800">
      <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate sm:whitespace-normal">{DEMO_NOTICE}</span>
    </div>
  );
}
