import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { CalendarCheck2, MessageCircle, ShieldCheck, Stethoscope } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { PageLoader } from '@/components/ui/Spinner';
import { BRAND } from '@/config/brand';

const HIGHLIGHTS = [
  { icon: CalendarCheck2, title: 'Gestión administrativa', text: 'Turnos, agendas, pacientes, coberturas y reportes en un solo lugar.' },
  { icon: Stethoscope, title: 'Panel médico', text: 'Agenda personal, pacientes, recetas y documentación clínica.' },
  { icon: MessageCircle, title: 'Asistente por WhatsApp', text: 'Autogestión de turnos, recetas y documentación para pacientes.' },
];

export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-surface">
      {/* Panel institucional */}
      <aside className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 p-10 text-white lg:flex xl:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent-400/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl" aria-hidden />

        <Logo variant="light" size={42} className="relative" />

        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-wider text-accent-300">Prototipo de demostración</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white xl:text-4xl">{BRAND.productName}</h1>
          <p className="mt-4 max-w-md text-primary-100/80">
            Una plataforma moderna para coordinar la atención oncológica: del primer contacto por WhatsApp a la consulta médica.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium text-white">{title}</p>
                  <p className="text-sm text-primary-100/70">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-primary-200/70">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          © {BRAND.copyrightYear} {BRAND.name} · Datos 100% ficticios
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex flex-1 flex-col">
        <div className="px-6 pt-6 lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-xl animate-fade-in">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
