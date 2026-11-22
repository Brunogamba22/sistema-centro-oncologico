import { Bot, CalendarClock, CalendarPlus, FileText, Headset, Pill, UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { BRAND } from '@/config/brand';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const FLOWS = [
  { icon: UserCheck, label: 'Identificación del paciente' },
  { icon: CalendarPlus, label: 'Solicitud de turnos' },
  { icon: CalendarClock, label: 'Reprogramación' },
  { icon: Pill, label: 'Recetas' },
  { icon: FileText, label: 'Documentación' },
  { icon: Headset, label: 'Atención humana' },
];

const PREVIEW_MESSAGES = [
  { from: 'bot', text: `¡Hola! 👋 Soy el asistente virtual del ${BRAND.name}.`, time: '09:41' },
  { from: 'bot', text: 'Para comenzar, por favor indicame tu número de DNI (sin puntos).', time: '09:41' },
  { from: 'user', text: '30123456', time: '09:42' },
  { from: 'bot', text: 'Gracias, Ana. ¿En qué te puedo ayudar hoy?', time: '09:42' },
] as const;

/** Vista previa estática. La demostración interactiva se desarrolla en la Fase 5. */
export default function ChatbotDemoPage() {
  useDocumentTitle('Demo Chatbot WhatsApp');

  return (
    <>
      <PageHeader
        title="Asistente virtual por WhatsApp"
        description="Demostración de la experiencia de autogestión del paciente."
        actions={
          <Badge variant="accent" dot>
            Interactivo en la Fase 5
          </Badge>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Mockup del teléfono */}
        <div className="mx-auto w-full max-w-[380px] rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl">
          <div className="overflow-hidden rounded-[1.9rem] bg-[#ECE5DD]">
            <div className="flex items-center gap-3 bg-primary-800 px-4 py-3 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500">
                <Bot className="h-5 w-5" aria-hidden />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold">{BRAND.name}</p>
                <p className="text-[11px] text-primary-200">en línea</p>
              </div>
            </div>
            <div className="flex h-[460px] flex-col gap-2 overflow-y-auto p-3">
              <span className="mx-auto mb-1 rounded-md bg-white/80 px-2 py-0.5 text-[11px] text-slate-500">HOY</span>
              {PREVIEW_MESSAGES.map((message, index) => (
                <div
                  key={index}
                  className={
                    message.from === 'bot'
                      ? 'max-w-[85%] self-start rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm'
                      : 'max-w-[85%] self-end rounded-lg rounded-tr-none bg-[#D9FDD3] px-3 py-2 shadow-sm'
                  }
                >
                  <p className="text-sm text-slate-800">{message.text}</p>
                  <p className="mt-0.5 text-right text-[10px] text-slate-400">{message.time}</p>
                </div>
              ))}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {['Solicitar turno', 'Mis turnos', 'Recetas'].map((option) => (
                  <span
                    key={option}
                    className="rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-medium text-primary-700"
                  >
                    {option}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#F0F2F5] px-3 py-2.5">
              <div className="h-9 flex-1 rounded-full bg-white px-4 text-sm leading-9 text-slate-400">Escribí un mensaje</div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader title="Flujos de conversación" description="Se implementarán con un motor de flujos configurable." />
          <ul className="divide-y divide-line">
            {FLOWS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="flex-1 text-sm font-medium text-slate-800">{label}</span>
                <Badge>Fase 5</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
