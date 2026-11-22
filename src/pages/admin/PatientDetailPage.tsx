import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  FileText,
  History,
  Pencil,
  Plus,
  Upload,
  UserRound,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  PageLoader,
  Select,
  Tabs,
  type TabItem,
} from '@/components/ui';
import {
  APPOINTMENT_STATUS_META,
  APPOINTMENT_TYPE_LABELS,
  CHANNEL_META,
  COVERAGE_TYPE_LABELS,
  DOCUMENT_CATEGORY_META,
  HISTORY_CATEGORY_META,
  PATIENT_STATUS_META,
} from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { useToast } from '@/context/toast/useToast';
import { AppointmentFormModal } from '@/features/appointments/AppointmentFormModal';
import { PatientFormModal } from '@/features/patients/PatientFormModal';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  appointmentsService,
  catalogService,
  doctorsService,
  documentsService,
  patientHistoryService,
  patientsService,
} from '@/services';
import type { PatientPayload } from '@/services/patientsService';
import type { DocumentCategory } from '@/types';
import { calculateAge, formatDate, formatDateTime, formatDNI, formatPhoneAR, formatTime } from '@/utils/format';

type ProfileTab = 'personal' | 'coverage' | 'appointments' | 'documents' | 'history';

const GENDER_LABEL = { F: 'Femenino', M: 'Masculino', X: 'X / No binario' } as const;

export default function PatientDetailPage() {
  const { patientId = '' } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [aptModalOpen, setAptModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('estudio');
  const [uploading, setUploading] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const [patient, patientAppointments, patientDocs, history, coverages, doctors, specialties, allPatients] =
      await Promise.all([
        patientsService.getById(patientId),
        appointmentsService.listByPatient(patientId),
        documentsService.listByPatient(patientId),
        patientHistoryService.listByPatient(patientId),
        catalogService.listCoverages(),
        doctorsService.list(),
        catalogService.listSpecialties(),
        patientsService.list(),
      ]);
    return { patient, patientAppointments, patientDocs, history, coverages, doctors, specialties, allPatients };
  }, [patientId]);

  useDocumentTitle(data ? `${data.patient.lastName}, ${data.patient.firstName}` : 'Perfil del paciente');

  if (loading) return <PageLoader />;

  if (error || !data) {
    return (
      <Card>
        <EmptyState
          icon={UserRound}
          title="Paciente no encontrado"
          description="El registro solicitado no existe en los datos de demostración."
          action={
            <Link to="/admin/pacientes">
              <Button size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Volver al padrón
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const { patient, patientAppointments, patientDocs, history, coverages, doctors, specialties, allPatients } = data;
  const coverage = coverages.find((c) => c.id === patient.coverage.coverageId);
  const assignedDoctor = doctors.find((d) => d.id === patient.assignedDoctorId);
  const doctorMap = new Map(doctors.map((d) => [d.id, d]));
  const specialtyMap = new Map(specialties.map((s) => [s.id, s]));
  const statusMeta = PATIENT_STATUS_META[patient.status];

  const tabs: TabItem<ProfileTab>[] = [
    { id: 'personal', label: 'Información personal', icon: UserRound },
    { id: 'coverage', label: 'Obra social', icon: CreditCard },
    { id: 'appointments', label: 'Turnos', icon: CalendarClock, count: patientAppointments.length },
    { id: 'documents', label: 'Documentación', icon: FileText, count: patientDocs.length },
    { id: 'history', label: 'Historial disponible', icon: History, count: history.length },
  ];

  const handleUpdatePatient = async (payload: PatientPayload, id?: string) => {
    if (!id) return;
    await patientsService.update(id, payload);
    toast({ title: 'Datos actualizados', description: 'Se guardaron los cambios del paciente.', variant: 'success' });
    await reload();
  };

  const handleCreateAppointment = async (
    result: Parameters<React.ComponentProps<typeof AppointmentFormModal>['onSubmit']>[0],
  ) => {
    if (result.mode === 'create' && result.payload) {
      await appointmentsService.create(result.payload);
      toast({ title: 'Turno agendado', description: 'El turno fue asociado al paciente.', variant: 'success' });
      await reload();
    }
  };

  const handleUploadSimulated = async (event: FormEvent) => {
    event.preventDefault();
    if (!docName.trim()) return;
    setUploading(true);
    try {
      await documentsService.uploadSimulated({
        patientId: patient.id,
        name: docName.trim().endsWith('.pdf') ? docName.trim() : `${docName.trim()}.pdf`,
        category: docCategory,
        fileType: 'pdf',
        sizeKb: 245,
        uploadedBy: user?.name ?? 'Administración',
      });
      setDocName('');
      setUploadModalOpen(false);
      toast({
        title: 'Documento registrado (simulado)',
        description: 'No se subió ningún archivo real; se agregó a la lista de demostración.',
        variant: 'success',
      });
      await reload();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/admin/pacientes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al listado de pacientes
      </Link>

      {/* Cabecera de ficha */}
      <Card>
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={`${patient.firstName} ${patient.lastName}`} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  {patient.lastName}, {patient.firstName}
                </h2>
                <Badge variant={statusMeta.variant} dot>
                  {statusMeta.label}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                DNI {formatDNI(patient.dni)} · {calculateAge(patient.birthDate)} años · {coverage?.name ?? 'Particular'}
                {patient.coverage.plan ? ` (${patient.coverage.plan})` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditModalOpen(true)}>
              Editar datos
            </Button>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAptModalOpen(true)}>
              Nuevo turno
            </Button>
          </div>
        </CardContent>
        <div className="px-5">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </Card>

      {/* Contenido de pestañas */}
      {activeTab === 'personal' && (
        <Card>
          <CardHeader title="Información personal y contacto" description="Datos administrativos ficticios del paciente" />
          <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Nombre completo</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {patient.firstName} {patient.lastName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">DNI</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDNI(patient.dni)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Fecha de nacimiento</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatDate(`${patient.birthDate.slice(0, 10)}T12:00:00`)} ({calculateAge(patient.birthDate)} años)
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Género</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{GENDER_LABEL[patient.gender]}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Teléfono</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatPhoneAR(patient.phone)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Correo electrónico</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{patient.email ?? 'No informado'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Domicilio</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {patient.address
                  ? `${patient.address.street}, ${patient.address.city} (${patient.address.province})`
                  : 'No informado'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Profesional de cabecera</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {assignedDoctor
                  ? `${assignedDoctor.title} ${assignedDoctor.firstName} ${assignedDoctor.lastName}`
                  : 'Sin asignar'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Última actualización</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(patient.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'coverage' && (
        <Card>
          <CardHeader
            title="Obra social / Prepaga"
            description="Credencial administrativa registrada para facturación y autorizaciones"
            action={
              <Button variant="outline" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditModalOpen(true)}>
                Actualizar cobertura
              </Button>
            }
          />
          <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Entidad</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{coverage?.name ?? 'Particular'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Tipo</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {coverage ? COVERAGE_TYPE_LABELS[coverage.type] : 'Particular'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Plan</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{patient.coverage.plan ?? 'No aplica'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Número de afiliado</p>
              <p className="mt-1 text-sm font-semibold text-primary-800">{patient.coverage.affiliateNumber}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'appointments' && (
        <Card>
          <CardHeader
            title="Turnos del paciente"
            description="Historial y próximos turnos agendados"
            action={
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAptModalOpen(true)}>
                Agendar turno
              </Button>
            }
          />
          {patientAppointments.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Sin turnos registrados"
              description="Este paciente aún no tiene turnos asociados en la agenda."
            />
          ) : (
            <ul className="divide-y divide-line">
              {patientAppointments.map((apt) => {
                const doctor = doctorMap.get(apt.doctorId);
                const specialty = specialtyMap.get(apt.specialtyId);
                const st = APPOINTMENT_STATUS_META[apt.status];
                const ch = CHANNEL_META[apt.channel];
                return (
                  <li key={apt.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatDate(apt.startAt)} · {formatTime(apt.startAt)} a {formatTime(apt.endAt)} hs
                      </p>
                      <p className="text-xs text-slate-500">
                        {doctor ? `${doctor.title} ${doctor.firstName} ${doctor.lastName}` : 'Profesional'} ·{' '}
                        {specialty?.name} · {APPOINTMENT_TYPE_LABELS[apt.type]}
                      </p>
                      {apt.notes && <p className="mt-1 text-xs text-slate-600">{apt.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={ch.variant}>{ch.label}</Badge>
                      <Badge variant={st.variant} dot>
                        {st.label}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card>
          <CardHeader
            title="Documentación del paciente"
            description="Estudios, informes, consentimientos y autorizaciones (simulado)"
            action={
              <Button size="sm" variant="outline" leftIcon={<Upload className="h-4 w-4" />} onClick={() => setUploadModalOpen(true)}>
                Registrar documento
              </Button>
            }
          />
          {patientDocs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sin documentación cargada"
              description="Podés registrar un documento de demostración para probar el flujo."
            />
          ) : (
            <ul className="divide-y divide-line">
              {patientDocs.map((doc) => {
                const cat = DOCUMENT_CATEGORY_META[doc.category];
                return (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                        <p className="text-xs text-slate-500">
                          Cargado por {doc.uploadedBy} · {formatDate(doc.createdAt)} · {doc.sizeKb} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={cat.variant}>{cat.label}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toast({
                            title: 'Vista previa simulada',
                            description: `Archivo ficticio: ${doc.name}`,
                            variant: 'info',
                          })
                        }
                      >
                        Ver
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader title="Historial disponible" description="Línea de tiempo de eventos administrativos y de atención" />
          {history.length === 0 ? (
            <EmptyState
              icon={History}
              title="Sin eventos registrados"
              description="Aún no hay entradas en el historial de este paciente."
            />
          ) : (
            <CardContent>
              <ol className="relative space-y-6 border-l border-line pl-6">
                {history.map((event) => {
                  const cat = HISTORY_CATEGORY_META[event.category];
                  const doctor = event.doctorId ? doctorMap.get(event.doctorId) : undefined;
                  return (
                    <li key={event.id} className="relative">
                      <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-accent-500 ring-2 ring-accent-100" />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={cat.variant}>{cat.label}</Badge>
                        <span className="text-xs text-slate-500">{formatDateTime(event.date)}</span>
                      </div>
                      <h4 className="mt-1.5 text-sm font-semibold text-slate-900">{event.title}</h4>
                      <p className="mt-0.5 text-sm text-slate-600">{event.description}</p>
                      {doctor && (
                        <p className="mt-1 text-xs text-slate-500">
                          Profesional: {doctor.title} {doctor.firstName} {doctor.lastName}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          )}
        </Card>
      )}

      <PatientFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        patient={patient}
        coverages={coverages}
        doctors={doctors}
        onSubmit={handleUpdatePatient}
      />

      <AppointmentFormModal
        open={aptModalOpen}
        onClose={() => setAptModalOpen(false)}
        defaultPatientId={patient.id}
        defaultDoctorId={patient.assignedDoctorId}
        patients={allPatients}
        doctors={doctors}
        specialties={specialties}
        onSubmit={handleCreateAppointment}
      />

      <Modal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Registrar documento ficticio"
        description="Simulación de carga de documentación. No cargues archivos ni datos reales."
        footer={
          <>
            <Button variant="ghost" onClick={() => setUploadModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="upload-doc-form" loading={uploading}>
              Agregar a la ficha
            </Button>
          </>
        }
      >
        <form id="upload-doc-form" onSubmit={handleUploadSimulated} className="space-y-4">
          <Input
            label="Nombre del documento"
            required
            placeholder="Ej. Laboratorio control noviembre.pdf"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />
          <Select
            label="Categoría"
            value={docCategory}
            onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
            options={(Object.keys(DOCUMENT_CATEGORY_META) as DocumentCategory[]).map((k) => ({
              value: k,
              label: DOCUMENT_CATEGORY_META[k].label,
            }))}
          />
        </form>
      </Modal>
    </div>
  );
}
