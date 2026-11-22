import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export type BadgeVariant = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const VARIANTS: Record<BadgeVariant, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
  primary: { badge: 'bg-primary-50 text-primary-700 ring-primary-100', dot: 'bg-primary-500' },
  accent: { badge: 'bg-accent-50 text-accent-700 ring-accent-100', dot: 'bg-accent-500' },
  success: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100', dot: 'bg-emerald-500' },
  warning: { badge: 'bg-amber-50 text-amber-700 ring-amber-100', dot: 'bg-amber-500' },
  danger: { badge: 'bg-rose-50 text-rose-700 ring-rose-100', dot: 'bg-rose-500' },
  info: { badge: 'bg-sky-50 text-sky-700 ring-sky-100', dot: 'bg-sky-500' },
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({ variant = 'neutral', dot = false, className, children, ...props }: BadgeProps) {
  const styles = VARIANTS[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        styles.badge,
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} aria-hidden />}
      {children}
    </span>
  );
}
