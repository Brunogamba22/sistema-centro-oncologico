import { useState } from 'react';
import {
  CalendarClock,
  ClipboardList,
  FileText,
  History,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { Avatar, Badge } from '@/components/ui';
import {
  APPOINTMENT_STATUS_META,
  DOCUMENT_CATEGORY_META,
  HISTORY_CATEGORY_META,
  MEDICAL_REQUEST_STATUS_META,
  MEDICAL_REQUEST_TYPE_META,
  PATIENT_STATUS_META,
} from '@/config/status';
import type {
  Appointment,
  ClinicalDocument,
  Coverage,
  Doctor,
  MedicalRequest,
  Patient,
  PatientHistoryEvent,
  Specialty,
} from '@/types';
import { calculateAge, formatDate, formatDNI, formatPhoneAR, formatTime } from '@/utils/format';

interface PatientContextColumnProps {
  verified: boolean;
  patient: Patient | undefined;
  coverage: Coverage | undefined;
  assignedDoctor: Doctor | undefined;
  appointments: Appointment[];
  requests: MedicalRequest[];
  documents: ClinicalDocument[];
  history: PatientHistoryEvent[];
  doctorMap: Map<string, Doctor>;
  specialtyMap: Map<string, Specialty>;
  onQuickFillTestText: (text: string) => void;
}

type ContextTab = 'ficha' | 'turnos' | 'solicitudes' | 'historial';

const DEMO_VERIFICATION_SAMPLES = [
  { name: 'Ana Laura Gómez', dni: '30123456', birth: '14/05/1983' },
  { name: 'Carlos Alberto Méndez', dni: '24891204', birth: '02/11/1975' },
  { name: 'Beatriz Elena Sánchez', dni: '18542910', birth: '21/03/1966' },
];

export function PatientContextColumn({
  verified,
  patient,
  coverage,
  assignedDoctor,
  appointments,
  requests,
  documents,
  history,
  doctorMap,
  specialtyMap,
  onQuickFillTestText,
}: PatientContextColumnProps) {
  const [tab, setTab] = useState<ContextTab>('ficha');

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-line bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Ficha del paciente</p>
        {verified && patient ? (
          <Badge variant="success">
            <ShieldCheck className="mr-1 h-3 w-3" />
            Verificado
          </Badge>
        ) : (
          <Badge variant="warning">
            <Lock className="mr-1 h-3 w-3" />
            Protegida
          </Badge>
        )}
      </div>

      {/* Estado protegido sin verificación */}
      {!verified || !patient ? (
        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Información privada protegida</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Por seguridad del paciente, los datos identificatorios, cobertura, turnos y solicitudes solo se muestran
              una vez completada la verificación por <strong>DNI</strong> y <strong>dato adicional</strong>.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface/70 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Datos ficticios para probar Flujo 1
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Hacé clic para enviar DNI o fecha de nacimiento ficticios en el chat:
            </p>
            <ul className="mt-2.5 space-y-2">
              {DEMO_VERIFICATION_SAMPLES.map((sample) => (
                <li key={sample.dni} className="rounded-lg border border-line bg-white p-2.5 text-xs">
                  <p className="font-semibold text-slate-800">{sample.name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => onQuickFillTestText(sample.dni)}
                      className="rounded-md bg-primary-50 px-2 py-0.5 font-mono text-[11px] font-medium text-primary-700 hover:bg-primary-100"
                    >
                      DNI: {sample.dni}
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickFillTestText(sample.birth)}
                      className="rounded-md bg-accent-50 px-2 py-0.5 font-mono text-[11px] font-medium text-accent-700 hover:bg-accent-100"
                    >
                      Nac: {sample.birth}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <>
          {/* Cabecera del paciente */}
          <div className="border-b border-line p-4">
            <div className="flex items-center gap-3">
              <Avatar name={`${patient.firstName} ${patient.lastName}`} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {patient.lastName}, {patient.firstName}
                </p>
                <p className="text-xs text-slate-500">
                  DNI {formatDNI(patient.dni)} · {calculateAge(patient.birthDate)} años
                </p>
                <div className="mt-1.5">
                  <Badge variant={PATIENT_STATUS_META[patient.status].variant}>
                    {PATIENT_STATUS_META[patient.status].label}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Navegación interna */}
            <div className="mt-3.5 grid grid-cols-4 gap-1 rounded-lg bg-surface p-1 text-[11px] font-medium">
              {(
                [
                  { id: 'ficha', label: 'Datos', icon: UserRound },
                  { id: 'turnos', label: `Turnos (${appointments.length})`, icon: CalendarClock },
                  { id: 'solicitudes', label: `Sol. (${requests.length})`, icon: ClipboardList },
                  { id: 'historial', label: 'Docs', icon: FileText },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`rounded-md px-1.5 py-1.5 text-center transition ${
                    tab === item.id
                      ? 'bg-white text-primary-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido de la pestaña */}
          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4 text-xs">
            {tab === 'ficha' && (
              <>
                <div className="space-y-2 rounded-xl border border-line bg-surface/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Datos identificatorios
                  </p>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Nacimiento</span>
                    <span className="font-medium text-slate-800">{formatDate(`${patient.birthDate}T12:00:00`)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Teléfono</span>
                    <span className="font-medium text-slate-800">{formatPhoneAR(patient.phone)}</span>
                  </div>
                  {patient.email && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Correo</span>
                      <span className="truncate font-medium text-slate-800">{patient.email}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-xl border border-line bg-surface/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Cobertura médica</p>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Entidad</span>
                    <span className="text-right font-medium text-slate-800">{coverage?.name ?? 'Particular'}</span>
                  </div>
                  {patient.coverage.plan && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Plan</span>
                      <span className="font-medium text-slate-800">{patient.coverage.plan}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Afiliado</span>
                    <span className="font-mono font-medium text-slate-800">{patient.coverage.affiliateNumber}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-line bg-primary-50/50 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500">Profesional de cabecera</p>
                    <p className="truncate font-semibold text-slate-900">
                      {assignedDoctor ? `${assignedDoctor.title} ${assignedDoctor.firstName} ${assignedDoctor.lastName}` : 'Sin asignar'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-line p-2">
                    <p className="text-base font-bold text-primary-700">{appointments.length}</p>
                    <p className="text-[10px] text-slate-500">Turnos</p>
                  </div>
                  <div className="rounded-lg border border-line p-2">
                    <p className="text-base font-bold text-accent-600">{requests.length}</p>
                    <p className="text-[10px] text-slate-500">Solicitudes</p>
                  </div>
                  <div className="rounded-lg border border-line p-2">
                    <p className="text-base font-bold text-slate-700">{documents.length}</p>
                    <p className="text-[10px] text-slate-500">Documentos</p>
                  </div>
                </div>
              </>
            )}

            {tab === 'turnos' && (
              <div className="space-y-2">
                {appointments.length === 0 ? (
                  <p className="py-4 text-center text-slate-500">Sin turnos registrados.</p>
                ) : (
                  appointments.slice(0, 8).map((apt) => {
                    const doc = doctorMap.get(apt.doctorId);
                    const esp = specialtyMap.get(apt.specialtyId);
                    const meta = APPOINTMENT_STATUS_META[apt.status];
                    return (
                      <div key={apt.id} className="rounded-lg border border-line p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {formatDate(apt.startAt)} · {formatTime(apt.startAt)} hs
                          </span>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </div>
                        <p className="mt-1 font-medium text-slate-700">{esp?.name ?? 'Consulta'}</p>
                        <p className="text-[11px] text-slate-500">
                          {doc ? `${doc.title} ${doc.firstName} ${doc.lastName}` : 'Profesional'}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tab === 'solicitudes' && (
              <div className="space-y-2">
                {requests.length === 0 ? (
                  <p className="py-4 text-center text-slate-500">Sin solicitudes médicas registradas.</p>
                ) : (
                  requests.slice(0, 8).map((req) => {
                    const typeMeta = MEDICAL_REQUEST_TYPE_META[req.type];
                    const statusMeta = MEDICAL_REQUEST_STATUS_META[req.status];
                    return (
                      <div key={req.id} className="rounded-lg border border-line p-2.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                        </div>
                        {req.medicationDetails && (
                          <p className="mt-1.5 font-semibold text-slate-800">
                            {req.medicationDetails.declaredMedication} · {req.medicationDetails.dose}
                          </p>
                        )}
                        <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{req.description}</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          Ref. {req.id} · {formatDate(req.createdAt)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tab === 'historial' && (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <FileText className="h-3.5 w-3.5" /> Documentación ({documents.length})
                  </p>
                  {documents.length === 0 ? (
                    <p className="text-slate-500">Sin documentos cargados.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {documents.slice(0, 6).map((doc) => {
                        const meta = DOCUMENT_CATEGORY_META[doc.category];
                        return (
                          <li key={doc.id} className="rounded-lg border border-line p-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate font-medium text-slate-800">{doc.name}</p>
                              <Badge variant={meta.variant}>{meta.label}</Badge>
                            </div>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {doc.uploadedBy} · {doc.sizeKb} KB · {formatDate(doc.createdAt)}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <History className="h-3.5 w-3.5" /> Historial reciente
                  </p>
                  {history.length === 0 ? (
                    <p className="text-slate-500">Sin eventos registrados.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {history.slice(0, 5).map((ev) => {
                        const meta = HISTORY_CATEGORY_META[ev.category];
                        return (
                          <li key={ev.id} className="rounded-lg border border-line p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800">{ev.title}</span>
                              <Badge variant={meta.variant}>{meta.label}</Badge>
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-600">{ev.description}</p>
                            <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(ev.date)}</p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
