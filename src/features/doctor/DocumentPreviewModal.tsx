import { Download, FileImage, FileText } from 'lucide-react';
import { Badge, Button, Modal } from '@/components/ui';
import { DOCUMENT_CATEGORY_META } from '@/config/status';
import { useToast } from '@/context/toast/useToast';
import { doctorPortalService } from '@/services';
import type { ClinicalDocument, Patient } from '@/types';
import { formatDateTime, formatDNI } from '@/utils/format';
import { DomainTag } from './ClinicalScopeBanner';

interface DocumentPreviewModalProps {
  document: ClinicalDocument | null;
  patient?: Patient;
  onClose: () => void;
}

export function DocumentPreviewModal({ document, patient, onClose }: DocumentPreviewModalProps) {
  const { toast } = useToast();

  if (!document) return null;

  const preview = doctorPortalService.getDocumentPreview(document);
  const categoryMeta = DOCUMENT_CATEGORY_META[document.category];

  const handleSimulatedDownload = () => {
    toast({
      title: 'Descarga simulada',
      description: `Se preparó "${document.name}" (${document.sizeKb} KB) en modo demostración.`,
      variant: 'info',
    });
  };

  return (
    <Modal
      open={Boolean(document)}
      onClose={onClose}
      size="lg"
      title={document.name}
      description={`Código ${preview.documentCode} · Cargado el ${formatDateTime(document.createdAt)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleSimulatedDownload}
          >
            Descargar copia (demo)
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <DomainTag domain={preview.domain} />
          <Badge variant={categoryMeta.variant}>{categoryMeta.label}</Badge>
          <Badge variant="neutral">{document.fileType.toUpperCase()} · {document.sizeKb} KB</Badge>
        </div>

        {/* Metadatos del documento */}
        <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 text-xs sm:grid-cols-2">
          {patient && (
            <div>
              <p className="text-slate-500">Paciente</p>
              <p className="mt-0.5 font-medium text-slate-900">
                {patient.firstName} {patient.lastName} · DNI {formatDNI(patient.dni)}
              </p>
            </div>
          )}
          <div>
            <p className="text-slate-500">Emisor / Origen</p>
            <p className="mt-0.5 font-medium text-slate-900">{preview.issuer}</p>
          </div>
          <div>
            <p className="text-slate-500">Cargado por</p>
            <p className="mt-0.5 font-medium text-slate-900">{document.uploadedBy}</p>
          </div>
          <div>
            <p className="text-slate-500">Fecha de recepción</p>
            <p className="mt-0.5 font-medium text-slate-900">{formatDateTime(document.createdAt)}</p>
          </div>
        </div>

        {/* Vista previa simulada */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-inner">
          <div className="mb-4 flex items-center justify-between border-b border-dashed border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                {document.fileType === 'imagen' ? (
                  <FileImage className="h-5 w-5" aria-hidden />
                ) : (
                  <FileText className="h-5 w-5" aria-hidden />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Vista previa del documento ficticio</p>
                <p className="text-xs text-slate-500">{preview.issuer}</p>
              </div>
            </div>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
              {preview.documentCode}
            </span>
          </div>

          <p className="mb-4 text-sm text-slate-700">{preview.summary}</p>

          <div className="space-y-4">
            {preview.sections.map((section) => (
              <div key={section.heading} className="rounded-lg bg-slate-50 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{section.heading}</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {section.lines.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            Documento de demostración con datos ficticios. Su interpretación corresponde exclusivamente al profesional
            tratante.
          </p>
        </div>
      </div>
    </Modal>
  );
}
