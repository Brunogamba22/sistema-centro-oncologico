import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileImage, FileText, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  PageLoader,
  Select,
  TableContainer,
} from '@/components/ui';
import { DOCUMENT_CATEGORY_META, DOCUMENT_DOMAIN_META } from '@/config/status';
import { useAuth } from '@/context/auth/useAuth';
import { DomainTag } from '@/features/doctor/ClinicalScopeBanner';
import { DocumentPreviewModal } from '@/features/doctor/DocumentPreviewModal';
import { useAsync } from '@/hooks/useAsync';
import { doctorPortalService, documentsService, patientsService } from '@/services';
import type { ClinicalDocument, DocumentCategory } from '@/types';
import { formatDate, formatDNI } from '@/utils/format';

export default function DoctorDocumentsPage() {
  const { user } = useAuth();
  const doctorId = user?.doctorId;

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [patientFilter, setPatientFilter] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<ClinicalDocument | null>(null);

  const { data, loading } = useAsync(async () => {
    const [allPatients, allDocuments] = await Promise.all([
      patientsService.list(),
      documentsService.listAll(),
    ]);

    const myPatients = doctorPortalService.filterAuthorizedPatients(allPatients, doctorId);
    const authorizedIds = new Set(myPatients.map((p) => p.id));

    return {
      myPatients,
      myDocuments: allDocuments.filter((d) => authorizedIds.has(d.patientId)),
    };
  }, [doctorId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const patientsById = new Map(data.myPatients.map((p) => [p.id, p]));
    const q = query.trim().toLowerCase();

    return data.myDocuments.filter((doc) => {
      if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
      if (domainFilter !== 'all' && DOCUMENT_DOMAIN_META[doc.category].domain !== domainFilter) return false;
      if (patientFilter !== 'all' && doc.patientId !== patientFilter) return false;
      if (!q) return true;
      const p = patientsById.get(doc.patientId);
      const text = `${doc.name} ${doc.uploadedBy} ${p ? `${p.firstName} ${p.lastName} ${p.dni}` : ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [data, query, categoryFilter, domainFilter, patientFilter]);

  if (loading || !data) {
    return <PageLoader />;
  }

  const patientsById = new Map(data.myPatients.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentación recibida"
        description="Estudios, informes, recetas archivadas y comprobantes administrativos de tus pacientes autorizados."
      />

      <Card>
        <CardContent className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative lg:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por archivo, paciente o DNI..."
              className="pl-9"
              aria-label="Buscar documentación"
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              aria-label="Filtrar por paciente"
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todos mis pacientes' },
                ...data.myPatients.map((p) => ({
                  value: p.id,
                  label: `${p.lastName}, ${p.firstName}`,
                })),
              ]}
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              aria-label="Filtrar por categoría"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todas las categorías' },
                ...(Object.keys(DOCUMENT_CATEGORY_META) as DocumentCategory[]).map((k) => ({
                  value: k,
                  label: DOCUMENT_CATEGORY_META[k].label,
                })),
              ]}
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              aria-label="Filtrar por tipo de información"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Clínico y admin.' },
                { value: 'clinico', label: 'Solo clínico' },
                { value: 'administrativo', label: 'Solo admin.' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No se encontraron documentos"
            description="Ajustá los filtros para ver los archivos recibidos de tus pacientes."
          />
        ) : (
          <TableContainer>
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Documento</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Clasificación</th>
                  <th className="px-4 py-3">Origen / Fecha</th>
                  <th className="px-5 py-3 text-right">Vista previa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((doc) => {
                  const patient = patientsById.get(doc.patientId);
                  const catMeta = DOCUMENT_CATEGORY_META[doc.category];
                  const domainMeta = DOCUMENT_DOMAIN_META[doc.category];

                  return (
                    <tr key={doc.id} className="transition hover:bg-surface/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                            {doc.fileType === 'imagen' ? (
                              <FileImage className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{doc.name}</p>
                            <p className="text-xs text-slate-500">
                              {doc.fileType.toUpperCase()} · {doc.sizeKb} KB
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {patient ? (
                          <div>
                            <Link
                              to={`/medico/pacientes/${patient.id}`}
                              className="font-medium text-slate-900 hover:text-primary-700 hover:underline"
                            >
                              {patient.firstName} {patient.lastName}
                            </Link>
                            <p className="text-xs text-slate-500">DNI {formatDNI(patient.dni)}</p>
                          </div>
                        ) : (
                          'Paciente'
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <DomainTag domain={domainMeta.domain} />
                          <Badge variant={catMeta.variant}>{catMeta.label}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <p className="font-medium text-slate-800">{doc.uploadedBy}</p>
                        <p className="text-slate-500">{formatDate(doc.createdAt)}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Eye className="h-3.5 w-3.5" />}
                          onClick={() => setPreviewDoc(doc)}
                        >
                          Visualizar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableContainer>
        )}
      </Card>

      <DocumentPreviewModal
        document={previewDoc}
        patient={previewDoc ? patientsById.get(previewDoc.patientId) : undefined}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
