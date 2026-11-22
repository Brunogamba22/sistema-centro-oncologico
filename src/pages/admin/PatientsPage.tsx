import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Plus, RotateCcw, Search, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  PageLoader,
  Pagination,
  Select,
  TableContainer,
} from '@/components/ui';
import { PATIENT_STATUS_META } from '@/config/status';
import { useToast } from '@/context/toast/useToast';
import { PatientFormModal } from '@/features/patients/PatientFormModal';
import { useAsync } from '@/hooks/useAsync';
import { catalogService, doctorsService, patientsService } from '@/services';
import type { PatientPayload } from '@/services/patientsService';
import type { Patient, PatientStatus } from '@/types';
import { calculateAge, formatDNI, formatPhoneAR } from '@/utils/format';

const PAGE_SIZE = 10;

export default function PatientsPage() {
  const { toast } = useToast();
  const { data, loading, reload } = useAsync(async () => {
    const [patients, coverages, doctors] = await Promise.all([
      patientsService.list(),
      catalogService.listCoverages(),
      doctorsService.list(),
    ]);
    return { patients, coverages, doctors };
  }, []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [coverageFilter, setCoverageFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const coverageMap = useMemo(() => new Map(data?.coverages.map((c) => [c.id, c]) ?? []), [data?.coverages]);
  const doctorMap = useMemo(() => new Map(data?.doctors.map((d) => [d.id, d]) ?? []), [data?.doctors]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return data.patients.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (coverageFilter && p.coverage.coverageId !== coverageFilter) return false;
      if (doctorFilter && p.assignedDoctorId !== doctorFilter) return false;
      if (q) {
        const fullName = `${p.firstName} ${p.lastName} ${p.lastName}, ${p.firstName}`.toLowerCase();
        const matchesName = fullName.includes(q);
        const matchesDni = digits.length > 0 && p.dni.includes(digits);
        const matchesAffiliate = p.coverage.affiliateNumber.toLowerCase().includes(q);
        if (!matchesName && !matchesDni && !matchesAffiliate) return false;
      }
      return true;
    });
  }, [data, search, statusFilter, coverageFilter, doctorFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasFilters = Boolean(search || statusFilter || coverageFilter || doctorFilter);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCoverageFilter('');
    setDoctorFilter('');
    setPage(1);
  };

  const handleOpenCreate = () => {
    setEditingPatient(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setModalOpen(true);
  };

  const handleSubmit = async (payload: PatientPayload, patientId?: string) => {
    if (patientId) {
      await patientsService.update(patientId, payload);
      toast({
        title: 'Paciente actualizado',
        description: `Se guardaron los datos administrativos de ${payload.lastName}, ${payload.firstName}.`,
        variant: 'success',
      });
    } else {
      await patientsService.create(payload);
      toast({
        title: 'Paciente registrado',
        description: `${payload.lastName}, ${payload.firstName} fue incorporado al padrón demo.`,
        variant: 'success',
      });
    }
    await reload();
  };

  if (loading || !data) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        description="Padrón administrativo de pacientes ficticios, coberturas médicas y acceso a la ficha."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
            Registrar paciente
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Buscar por DNI, nombre o afiliado…"
            leftIcon={<Search />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            placeholder="Todos los estados"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={(Object.keys(PATIENT_STATUS_META) as PatientStatus[]).map((k) => ({
              value: k,
              label: PATIENT_STATUS_META[k].label,
            }))}
          />
          <Select
            placeholder="Todas las coberturas"
            value={coverageFilter}
            onChange={(e) => {
              setCoverageFilter(e.target.value);
              setPage(1);
            }}
            options={data.coverages.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            placeholder="Todos los profesionales"
            value={doctorFilter}
            onChange={(e) => {
              setDoctorFilter(e.target.value);
              setPage(1);
            }}
            options={data.doctors.map((d) => ({ value: d.id, label: `${d.title} ${d.lastName}` }))}
          />
        </CardContent>
        {hasFilters && (
          <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-xs text-slate-500">
            <span>{filtered.length} paciente(s) encontrados</span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-medium text-primary-700 hover:underline"
            >
              <RotateCcw className="h-3 w-3" /> Limpiar filtros
            </button>
          </div>
        )}
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No se encontraron pacientes"
            description="Ajustá los criterios de búsqueda o registrá un nuevo paciente."
            action={
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <>
            <TableContainer>
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-line bg-surface/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Paciente</th>
                    <th className="px-5 py-3">DNI / Edad</th>
                    <th className="px-5 py-3">Cobertura y afiliado</th>
                    <th className="px-5 py-3">Teléfono</th>
                    <th className="px-5 py-3">Profesional</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginated.map((patient) => {
                    const coverage = coverageMap.get(patient.coverage.coverageId);
                    const doctor = patient.assignedDoctorId ? doctorMap.get(patient.assignedDoctorId) : undefined;
                    const statusMeta = PATIENT_STATUS_META[patient.status];

                    return (
                      <tr key={patient.id} className="transition hover:bg-surface/50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={`${patient.firstName} ${patient.lastName}`} size="sm" />
                            <div className="min-w-0">
                              <Link
                                to={`/admin/pacientes/${patient.id}`}
                                className="block truncate font-semibold text-slate-900 hover:text-primary-700"
                              >
                                {patient.lastName}, {patient.firstName}
                              </Link>
                              <p className="truncate text-xs text-slate-500">{patient.email ?? 'Sin correo'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <p className="font-medium text-slate-800">{formatDNI(patient.dni)}</p>
                          <p className="text-xs text-slate-500">{calculateAge(patient.birthDate)} años</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="max-w-[220px] truncate font-medium text-slate-800">
                            {coverage?.name ?? 'Particular'}
                            {patient.coverage.plan ? ` · ${patient.coverage.plan}` : ''}
                          </p>
                          <p className="text-xs text-slate-500">Af. {patient.coverage.affiliateNumber}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                          {formatPhoneAR(patient.phone)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                          {doctor ? `${doctor.title} ${doctor.lastName}` : 'Sin asignar'}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <Badge variant={statusMeta.variant} dot>
                            {statusMeta.label}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              to={`/admin/pacientes/${patient.id}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-primary-700 transition hover:bg-primary-50"
                            >
                              <Eye className="h-3.5 w-3.5" /> Perfil
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Editar datos administrativos"
                              onClick={() => handleOpenEdit(patient)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableContainer>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <PatientFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        patient={editingPatient}
        coverages={data.coverages}
        doctors={data.doctors}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
