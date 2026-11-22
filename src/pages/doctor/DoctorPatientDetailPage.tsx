import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Eye,
  FileText,
  History,
  Lock,
  Mail,
  MapPin,
  Phone,
  Pill,
  Plus,
  UserRound,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  PageLoader,
  Select,
  Tabs,
  Textarea,
  type TabItem,
} from '@/components/ui';
import {
  APPOINTMENT_STATUS_META,
  APPOINTMENT_TYPE_LABELS,
  COVERAGE_TYPE_LABELS,
  DOCUMENT_CATEGORY_META,
  DOCUMENT_DOMAIN_META,
  HISTORY_CATEGORY_META,
  MEDICAL_REQUEST_STATUS_META,
  PATIENT_STATUS_META,
} from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { ClinicalResponsibilityNotice, DomainTag } from '@/features/doctor/ClinicalScopeBanner';
import { DocumentPreviewModal } from '@/features/doctor/DocumentPreviewModal';
import { useAsync } from '@/hooks/useAsync';
import {
  appointmentsService,
  catalogService,
  doctorPortalService,
  doctorsService,
  documentsService,
  medicalRequestsService,
  patientHistoryService,
  patientsService,
} from '@/services';
import type { ClinicalDocument, PatientHistoryCategory } from '@/types';
import { calculateAge, formatDate, formatDateTime, formatDNI, formatPhoneAR, formatTime } from '@/utils/format';

type PatientTab = 'info' | 'medicacion' | 'documentacion' | 'turnos' | 'historial';

const GENDER_LABELS = { F: 'Femenino', M: 'Masculino', X: 'No binario / X' } as const;

export default function DoctorPatientDetailPage() {
  const { patientId = '' } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const doctorId = user?.doctorId;

  const [activeTab, setActiveTab] = useState<PatientTab>('info');
  const [previewDoc, setPreviewDoc] = useState<ClinicalDocument | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  // Modal para registrar una nota de seguimiento en historial disponible
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState<PatientHistoryCategory>('consulta');
  const [noteDescription, setNoteDescription] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const { data, loading, reload } = useAsync(async () => {
    const [allPatients, coverages, doctors, specialties] = await Promise.all([
      patientsService.list(),
      catalogService.listCoverages(),
      doctorsService.list(),
      catalogService.listSpecialties(),
    ]);

    const patient = allPatients.find((p) => p.id === patientId);
    const authorized = doctorPortalService.isPatientAuthorized(patient, doctorId);

    if (!patient || !authorized) {
      return { patient, authorized: false as const };
    }

    const [medications, documents, appointments, history, allRequests] = await Promise.all([
      doctorPortalService.listDeclaredMedications(patient.id),
      documentsService.listByPatient(patient.id),
      appointmentsService.listByPatient(patient.id),
      patientHistoryService.listByPatient(patient.id),
      medicalRequestsService.list(),
    ]);

    return {
      authorized: true as const,
      patient,
      coverage: coverages.find((c) => c.id === patient.coverage.coverageId),
      doctorsById: new Map(doctors.map((d) => [d.id, d])),
      specialtiesById: new Map(specialties.map((s) => [s.id, s])),
      medications,
      documents,
      appointments,
      history,
      prescriptionRequests: allRequests.filter(
        (r) => r.patientId === patient.id && r.type === 'receta' && r.doctorId === doctorId,
      ),
    };
  }, [patientId, doctorId]);

  const handleSaveNote = async () => {
    if (!data?.authorized || !noteTitle.trim() || !noteDescription.trim()) return;
    setSavingNote(true);
    try {
      await patientHistoryService.addEntry({
        patientId: data.patient.id,
        date: new Date().toISOString(),
        category: noteCategory,
        title: noteTitle.trim(),
        description: noteDescription.trim(),
        doctorId,
      });
      toast({
        title: 'Registro agregado',
        description: 'La nota de seguimiento quedó incorporada al historial del paciente.',
        variant: 'success',
      });
      setNoteTitle('');
      setNoteDescription('');
      setNoteModalOpen(false);
      await reload();
    } finally {
      setSavingNote(false);
    }
  };

  if (loading || !data) {
    return <PageLoader />;
  }

  if (!data.authorized) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Acceso restringido"
          description="Permisos por profesional"
          actions={
            <Link to="/medico/pacientes">
              <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Volver a Mis pacientes
              </Button>
            </Link>
          }
        />
        <Card>
          <EmptyState
            icon={Lock}
            title="No tenés autorización para consultar esta ficha"
            description="Por confidencialidad clínica y permisos por profesional, solo podés acceder a los pacientes asignados a tu padrón."
            action={
              <Link to="/medico/pacientes">
                <Button variant="primary">Ir a Mis pacientes</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const { patient, coverage, doctorsById, specialtiesById, medications, documents, appointments, history } = data;
  const statusMeta = PATIENT_STATUS_META[patient.status];

  const tabs: TabItem<PatientTab>[] = [
    { id: 'info', label: 'Información personal y cobertura', icon: UserRound },
    { id: 'medicacion', label: 'Medicación declarada', icon: Pill, count: medications.length },
    { id: 'documentacion', label: 'Documentación', icon: FileText, count: documents.length },
    { id: 'turnos', label: 'Turnos', icon: CalendarDays, count: appointments.length },
    { id: 'historial', label: 'Historial disponible', icon: History, count: history.length },
  ];

  const filteredHistory =
    historyFilter === 'all' ? history : history.filter((h) => h.category === historyFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          to="/medico/pacientes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-primary-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Mis pacientes
        </Link>
      </div>

      {/* Cabecera del paciente */}
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={`${patient.firstName} ${patient.lastName}`} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  {patient.firstName} {patient.lastName}
                </h2>
                <Badge variant={statusMeta.variant} dot>
                  {statusMeta.label}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                DNI {formatDNI(patient.dni)} · {calculateAge(patient.birthDate)} años · {GENDER_LABELS[patient.gender]}
                {coverage ? ` · ${coverage.name}${patient.coverage.plan ? ` (${patient.coverage.plan})` : ''}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setNoteModalOpen(true)}
            >
              Registrar seguimiento
            </Button>
            <Link to="/medico/recetas">
              <Button variant="primary" size="sm" leftIcon={<Pill className="h-4 w-4" />}>
                Ver recetas
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <ClinicalResponsibilityNotice compact />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: Información personal y cobertura */}
      {activeTab === 'info' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Datos personales y contacto"
              description="Información identificatoria del paciente"
              action={<DomainTag domain="administrativo" />}
            />
            <CardContent className="space-y-3.5 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Nombre completo</p>
                  <p className="mt-0.5 font-medium text-slate-900">
                    {patient.firstName} {patient.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Documento (DNI)</p>
                  <p className="mt-0.5 font-mono font-medium text-slate-900">{formatDNI(patient.dni)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Fecha de nacimiento</p>
                  <p className="mt-0.5 font-medium text-slate-900">
                    {formatDate(patient.birthDate)} ({calculateAge(patient.birthDate)} años)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Género</p>
                  <p className="mt-0.5 font-medium text-slate-900">{GENDER_LABELS[patient.gender]}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-line pt-3">
                <p className="flex items-center gap-2 text-slate-700">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {formatPhoneAR(patient.phone)}
                </p>
                {patient.email && (
                  <p className="flex items-center gap-2 text-slate-700">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {patient.email}
                  </p>
                )}
                {patient.address && (
                  <p className="flex items-center gap-2 text-slate-700">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {patient.address.street}, {patient.address.city} ({patient.address.province})
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Cobertura médica y datos administrativos"
              description="Obra social, prepaga y credencial vigente"
              action={<DomainTag domain="administrativo" />}
            />
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{coverage?.name ?? 'Sin cobertura asignada'}</p>
                  <p className="text-xs text-slate-500">
                    {coverage ? COVERAGE_TYPE_LABELS[coverage.type] : '—'}
                    {patient.coverage.plan ? ` · Plan ${patient.coverage.plan}` : ''}
                  </p>
                  <p className="mt-1.5 font-mono text-xs text-slate-700">
                    N° afiliado: {patient.coverage.affiliateNumber}
                  </p>
                </div>
              </div>

              <dl className="grid gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-line p-3">
                  <dt className="text-slate-500">Estado de seguimiento</dt>
                  <dd className="mt-1">
                    <Badge variant={statusMeta.variant} dot>
                      {statusMeta.label}
                    </Badge>
                  </dd>
                </div>
                <div className="rounded-lg border border-line p-3">
                  <dt className="text-slate-500">Profesional a cargo</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {patient.assignedDoctorId && doctorsById.get(patient.assignedDoctorId)
                      ? `${doctorsById.get(patient.assignedDoctorId)!.title} ${doctorsById.get(patient.assignedDoctorId)!.firstName} ${doctorsById.get(patient.assignedDoctorId)!.lastName}`
                      : 'Sin asignar'}
                  </dd>
                </div>
                <div className="rounded-lg border border-line p-3">
                  <dt className="text-slate-500">Alta administrativa</dt>
                  <dd className="mt-1 font-medium text-slate-900">{formatDate(patient.createdAt)}</dd>
                </div>
                <div className="rounded-lg border border-line p-3">
                  <dt className="text-slate-500">Última actualización</dt>
                  <dd className="mt-1 font-medium text-slate-900">{formatDate(patient.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Medicación declarada */}
      {activeTab === 'medicacion' && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Medicación declarada por el paciente"
              description="Registro informativo de medicación habitual o de soporte informada por el paciente (no equivale a prescripción automática)."
              action={<DomainTag domain="clinico" />}
            />
            <CardContent className="p-0">
              {medications.length === 0 ? (
                <EmptyState
                  icon={Pill}
                  title="Sin medicación declarada"
                  description="El paciente no registra medicación declarada en el sistema."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {medications.map((med) => (
                    <li key={med.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{med.name}</p>
                            <Badge variant={med.active ? 'success' : 'neutral'}>
                              {med.active ? 'Vigente' : 'Suspendida'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            <strong>Dosis:</strong> {med.dose} · <strong>Frecuencia:</strong> {med.frequency} ·{' '}
                            <strong>Vía:</strong> {med.route}
                          </p>
                          {med.notes && <p className="mt-1 text-xs text-slate-500">{med.notes}</p>}
                        </div>
                        <span className="text-xs text-slate-400">Declarada el {formatDate(med.declaredAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {data.prescriptionRequests.length > 0 && (
            <Card>
              <CardHeader
                title="Solicitudes de recetas recientes de este paciente"
                description="Estado de revisiones profesionales vinculadas"
                action={
                  <Link to="/medico/recetas" className="text-xs font-medium text-primary-700 hover:underline">
                    Ir a Solicitudes de recetas
                  </Link>
                }
              />
              <CardContent className="p-0">
                <ul className="divide-y divide-line">
                  {data.prescriptionRequests.map((req) => {
                    const st = MEDICAL_REQUEST_STATUS_META[req.status];
                    return (
                      <li key={req.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {req.medicationDetails?.declaredMedication ?? req.description}
                          </p>
                          <p className="text-xs text-slate-500">
                            Solicitada el {formatDateTime(req.createdAt)}
                          </p>
                        </div>
                        <Badge variant={st.variant} dot>
                          {st.label}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB 3: Documentación */}
      {activeTab === 'documentacion' && (
        <Card>
          <CardHeader
            title="Documentación del paciente"
            description="Estudios clínicos, informes, recetas archivadas y constancias administrativas"
          />
          <CardContent className="p-0">
            {documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Sin documentación adjunta"
                description="Todavía no se cargaron archivos para este paciente."
              />
            ) : (
              <ul className="divide-y divide-line">
                {documents.map((doc) => {
                  const catMeta = DOCUMENT_CATEGORY_META[doc.category];
                  const domainMeta = DOCUMENT_DOMAIN_META[doc.category];
                  return (
                    <li
                      key={doc.id}
                      className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{doc.name}</p>
                          <p className="text-xs text-slate-500">
                            {formatDate(doc.createdAt)} · Cargado por {doc.uploadedBy} · {doc.sizeKb} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <DomainTag domain={domainMeta.domain} />
                        <Badge variant={catMeta.variant}>{catMeta.label}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Eye className="h-3.5 w-3.5" />}
                          onClick={() => setPreviewDoc(doc)}
                        >
                          Visualizar
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: Turnos */}
      {activeTab === 'turnos' && (
        <Card>
          <CardHeader
            title="Turnos registrados"
            description="Próximos turnos y atenciones anteriores del paciente"
            action={<DomainTag domain="administrativo" />}
          />
          <CardContent className="p-0">
            {appointments.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Sin turnos registrados" />
            ) : (
              <ul className="divide-y divide-line">
                {appointments.map((apt) => {
                  const st = APPOINTMENT_STATUS_META[apt.status];
                  const doc = doctorsById.get(apt.doctorId);
                  const spec = specialtiesById.get(apt.specialtyId);
                  return (
                    <li
                      key={apt.id}
                      className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatDate(apt.startAt)} · {formatTime(apt.startAt)} a {formatTime(apt.endAt)} hs
                        </p>
                        <p className="text-xs text-slate-500">
                          {APPOINTMENT_TYPE_LABELS[apt.type]}
                          {spec ? ` · ${spec.name}` : ''}
                          {doc ? ` · ${doc.title} ${doc.firstName} ${doc.lastName}` : ''}
                        </p>
                        {apt.notes && <p className="mt-1 text-xs text-slate-600">{apt.notes}</p>}
                      </div>
                      <Badge variant={st.variant} dot>
                        {st.label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 5: Historial disponible */}
      {activeTab === 'historial' && (
        <Card>
          <CardHeader
            title="Historial disponible"
            description="Línea de tiempo cronológica diferenciando registros clínicos y administrativos"
            action={
              <div className="flex items-center gap-2">
                <Select
                  aria-label="Filtrar historial por categoría"
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'Todas las categorías' },
                    ...(Object.keys(HISTORY_CATEGORY_META) as PatientHistoryCategory[]).map((k) => ({
                      value: k,
                      label: HISTORY_CATEGORY_META[k].label,
                    })),
                  ]}
                />
              </div>
            }
          />
          <CardContent>
            {filteredHistory.length === 0 ? (
              <EmptyState icon={History} title="Sin registros para el filtro elegido" />
            ) : (
              <ol className="space-y-4 border-l-2 border-primary-100 pl-4">
                {filteredHistory.map((ev) => {
                  const cat = HISTORY_CATEGORY_META[ev.category];
                  const doc = ev.doctorId ? doctorsById.get(ev.doctorId) : undefined;
                  const domain = ev.category === 'administrativo' ? 'administrativo' : 'clinico';
                  return (
                    <li key={ev.id} className="relative rounded-xl border border-line bg-surface/60 p-4">
                      <span
                        className="absolute -left-[23px] top-5 h-3 w-3 rounded-full border-2 border-white bg-primary-600"
                        aria-hidden
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{ev.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <DomainTag domain={domain} />
                          <Badge variant={cat.variant}>{cat.label}</Badge>
                        </div>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-600">{ev.description}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {formatDateTime(ev.date)}
                        {doc ? ` · ${doc.title} ${doc.firstName} ${doc.lastName}` : ' · Gestión del centro'}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      )}

      <DocumentPreviewModal document={previewDoc} patient={patient} onClose={() => setPreviewDoc(null)} />

      {/* Modal para agregar nota de seguimiento */}
      <Modal
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Registrar seguimiento en historial"
        description={`Paciente: ${patient.firstName} ${patient.lastName}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setNoteModalOpen(false)} disabled={savingNote}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={savingNote}
              disabled={!noteTitle.trim() || !noteDescription.trim()}
              onClick={handleSaveNote}
            >
              Guardar registro
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field id="note-category" label="Categoría">
            <Select
              id="note-category"
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value as PatientHistoryCategory)}
              options={[
                { value: 'consulta', label: 'Consulta (Clínico)' },
                { value: 'tratamiento', label: 'Tratamiento (Clínico)' },
                { value: 'estudio', label: 'Estudio (Clínico)' },
                { value: 'administrativo', label: 'Administrativo' },
              ]}
            />
          </Field>
          <Field id="note-title" label="Título breve" required>
            <Input
              id="note-title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Ej.: Control de seguimiento evolutivo"
            />
          </Field>
          <Field id="note-desc" label="Observaciones de seguimiento" required>
            <Textarea
              id="note-desc"
              rows={4}
              value={noteDescription}
              onChange={(e) => setNoteDescription(e.target.value)}
              placeholder="Registrá notas de evolución o seguimiento acordadas en la consulta..."
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
