import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Headset,
  Info,
  MessageCircle,
  Palette,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ROLE_CONFIG, ROLE_ORDER } from '@/config/roles';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { DEMO_USERS } from '@/data/users';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Role } from '@/types';
import { cn } from '@/utils/cn';

const ROLE_ICONS: Record<Role, LucideIcon> = {
  admin: ShieldCheck,
  medico: Stethoscope,
  recepcionista: Headset,
};

export default function LoginPage() {
  const { user, loginAsRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedRole, setSelectedRole] = useState<Role>('admin');
  const [loading, setLoading] = useState(false);

  useDocumentTitle('Acceso');

  // Sesión activa: ir directo al panel (salvo mientras se procesa un acceso).
  if (user && !loading) return <Navigate to={ROLE_CONFIG[user.role].homePath} replace />;

  const handleLogin = async () => {
    setLoading(true);
    try {
      const loggedUser = await loginAsRole(selectedRole);
      const home = ROLE_CONFIG[loggedUser.role].homePath;
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from?.startsWith(home) ? from : home, { replace: true });
      toast({
        title: `Bienvenido/a, ${loggedUser.name}`,
        description: `Ingresaste como ${ROLE_CONFIG[loggedUser.role].label}.`,
        variant: 'success',
      });
    } catch {
      setLoading(false);
      toast({ title: 'No se pudo iniciar la sesión', description: 'Intente nuevamente.', variant: 'danger' });
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Acceso de demostración</h2>
        <p className="mt-1.5 text-sm text-slate-500">Seleccioná un rol para ingresar al panel correspondiente.</p>
      </div>

      <div role="radiogroup" aria-label="Rol de acceso" className="space-y-3">
        {ROLE_ORDER.map((role) => {
          const config = ROLE_CONFIG[role];
          const demoUser = DEMO_USERS[role];
          const Icon = ROLE_ICONS[role];
          const selected = selectedRole === role;

          return (
            <button
              key={role}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setSelectedRole(role)}
              onDoubleClick={handleLogin}
              disabled={loading}
              className={cn(
                'group flex w-full items-start gap-4 rounded-xl border bg-white p-4 text-left transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
                selected
                  ? 'border-primary-500 shadow-card-hover ring-1 ring-primary-500'
                  : 'border-line shadow-card hover:border-primary-200',
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors',
                  selected ? 'bg-primary-700 text-white' : 'bg-primary-50 text-primary-700',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{config.label}</span>
                  <CheckCircle2
                    className={cn('h-5 w-5 shrink-0 transition', selected ? 'text-accent-500' : 'text-transparent')}
                    aria-hidden
                  />
                </span>
                <span className="mt-0.5 block text-sm text-slate-500">{config.description}</span>
                <span className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Avatar name={demoUser.name} size="xs" />
                  <span className="truncate">
                    {demoUser.name} · {demoUser.position}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <Button
        size="lg"
        fullWidth
        className="mt-6"
        loading={loading}
        onClick={handleLogin}
        rightIcon={<ArrowRight className="h-4 w-4" />}
      >
        Ingresar como {ROLE_CONFIG[selectedRole].label}
      </Button>

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-primary-50 px-3 py-2.5 text-xs text-primary-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Acceso simulado: no se solicitan credenciales. Todos los usuarios y pacientes son ficticios.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          to="/chatbot"
          className="group flex items-center gap-3 rounded-xl border border-line bg-white p-4 shadow-card transition hover:border-accent-300 hover:shadow-card-hover"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
            <MessageCircle className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Demo del chatbot</span>
            <span className="block text-xs text-slate-500">Experiencia del paciente por WhatsApp</span>
          </span>
          <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-accent-500" />
        </Link>
        <Link
          to="/sistema-de-diseno"
          className="group flex items-center gap-3 rounded-xl border border-line bg-white p-4 shadow-card transition hover:border-primary-300 hover:shadow-card-hover"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Palette className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Sistema de diseño</span>
            <span className="block text-xs text-slate-500">Colores, tipografía y componentes</span>
          </span>
          <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500" />
        </Link>
      </div>
    </div>
  );
}
