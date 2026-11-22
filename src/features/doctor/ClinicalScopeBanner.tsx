import { ShieldAlert, Stethoscope, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui';

/**
 * Etiqueta visual para distinguir información clínica disponible de información administrativa.
 */
export function DomainTag({ domain }: { domain: 'clinico' | 'administrativo' }) {
  if (domain === 'clinico') {
    return (
      <Badge variant="accent">
        <Stethoscope className="h-3 w-3" aria-hidden />
        Información clínica
      </Badge>
    );
  }
  return (
    <Badge variant="neutral">
      <Building2 className="h-3 w-3" aria-hidden />
      Información administrativa
    </Badge>
  );
}

/**
 * Aviso de alcance profesional: recuerda que el prototipo no emite diagnósticos ni prescripciones automáticas.
 */
export function ClinicalResponsibilityNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="note"
      className={
        compact
          ? 'flex items-start gap-2.5 rounded-lg border border-primary-200 bg-primary-50/70 px-3.5 py-2.5 text-xs text-primary-900'
          : 'flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50/70 px-4 py-3 text-xs text-primary-900'
      }
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" aria-hidden />
      <p className="leading-relaxed">
        <strong className="font-semibold">Intervención profesional obligatoria:</strong> la información presentada reúne
        datos declarados por el paciente y registros administrativos de apoyo. Este sistema no realiza diagnósticos ni
        emite prescripciones automáticas.
      </p>
    </div>
  );
}
