import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AccessDeniedPage({ homePath }: { homePath: string }) {
  return (
    <Card>
      <EmptyState
        icon={Lock}
        title="Acceso restringido"
        description="Su rol no tiene permisos para acceder a esta sección. Si lo necesita, solicite el acceso a un administrador."
        action={
          <Link
            to={homePath}
            className="inline-flex h-10 items-center rounded-lg bg-primary-700 px-4 text-sm font-medium text-white transition hover:bg-primary-800"
          >
            Volver al inicio
          </Link>
        }
      />
    </Card>
  );
}
