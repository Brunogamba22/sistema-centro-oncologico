import { BRAND } from '@/config/brand';
import { cn } from '@/utils/cn';

/** Isotipo por defecto (ficticio). Reemplazable configurando BRAND.logoUrl. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  if (BRAND.logoUrl) {
    return <img src={BRAND.logoUrl} alt={BRAND.name} width={size} height={size} className={cn('object-contain', className)} />;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label={BRAND.name}
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id="coi-logo-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F4C5C" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#coi-logo-gradient)" />
      <path d="M20 10v20M10 20h20" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="20" cy="20" r="4.5" fill="#0F4C5C" stroke="white" strokeWidth="2.5" />
    </svg>
  );
}

interface LogoProps {
  variant?: 'dark' | 'light';
  showText?: boolean;
  size?: number;
  className?: string;
}

/** Logotipo completo: isotipo + nombre institucional. */
export function Logo({ variant = 'dark', showText = true, size = 36, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} className={variant === 'light' ? 'ring-1 ring-white/15 rounded-[11px]' : undefined} />
      {showText && (
        <div className="min-w-0 leading-tight">
          <p className={cn('truncate text-sm font-semibold', variant === 'light' ? 'text-white' : 'text-primary-900')}>
            {BRAND.name}
          </p>
          <p className={cn('truncate text-[11px]', variant === 'light' ? 'text-primary-200' : 'text-slate-500')}>
            {BRAND.tagline}
          </p>
        </div>
      )}
    </div>
  );
}
