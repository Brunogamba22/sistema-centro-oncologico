import { Construction, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface ComingSoonPageProps {
  title: string;
  description?: string;
  phase?: number;
  icon?: LucideIcon;
}

/** Marcador para secciones planificadas en fases posteriores. */
export default function ComingSoonPage({ title, description, phase, icon: Icon = Construction }: ComingSoonPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="flex flex-col items-center px-6 py-16 text-center">
        <span className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          <Icon className="h-8 w-8" aria-hidden />
          <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-accent-400" aria-hidden />
        </span>
        {phase && (
          <Badge variant="accent" dot className="mb-3">
            Planificada para la Fase {phase}
          </Badge>
        )}
        <h3 className="text-base font-semibold text-slate-900">Pantalla en preparación</h3>
        <p className="mt-1.5 max-w-md text-sm text-slate-500">
          La navegación, los permisos por rol y el layout ya están operativos. El contenido de esta sección se
          desarrollará en la fase indicada del plan de implementación.
        </p>
      </Card>
    </>
  );
}
