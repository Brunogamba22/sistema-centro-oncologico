import { cn } from '@/utils/cn';

/** Clases compartidas por los controles de formulario (input, select, textarea). */
export const controlClasses = (hasError?: boolean) =>
  cn(
    'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm transition',
    'placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
    hasError
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
      : 'border-line focus:border-primary-400 focus:ring-primary-100',
  );
